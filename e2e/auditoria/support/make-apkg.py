#!/usr/bin/env python3
"""Generates e2e/auditoria/fixtures/ingles-niveis.apkg (prd-4b-caderno-v3 §10.2): 3 levels of decks + 1 deep level
+ 230 Anki tags, in the shape memorai-api reads (the same tables as its UploadsAnkiDestinationFixture).
Run from anywhere: python3 e2e/auditoria/support/make-apkg.py"""
import json
import os
import sqlite3
import tempfile
import zipfile

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'fixtures', 'ingles-niveis.apkg')
DECKS = {
    1: 'Default',
    2: 'Inglês',
    3: 'Inglês::Vocabulary',
    4: 'Inglês::Vocabulary::Food',
    5: 'Inglês::Vocabulary::Food::Fruits',
    6: 'Inglês::Grammar',
    7: 'Inglês::Listening',
}
FRONTS = [('Hello', 2), ('Dog', 3), ('Bread', 4), ('Rice', 4), ('Apple', 5), ('Present', 6), ('Past', 6), ('Podcast', 7)]
TAGS = [f'tag{i:03d}' for i in range(1, 230)]

with tempfile.TemporaryDirectory() as tmp:
    db_path = os.path.join(tmp, 'collection.anki2')
    db = sqlite3.connect(db_path)
    db.execute('CREATE TABLE col (models TEXT, decks TEXT)')
    db.execute('CREATE TABLE notes (id INTEGER, mid INTEGER, tags TEXT, flds TEXT)')
    db.execute('CREATE TABLE cards (id INTEGER, nid INTEGER, did INTEGER, ord INTEGER, type INTEGER, reps INTEGER, lapses INTEGER, ivl INTEGER, factor INTEGER)')
    db.execute('INSERT INTO col VALUES (?, ?)', (
        json.dumps({'100': {'id': 100, 'name': 'Basic', 'type': 0}}),
        json.dumps({str(i): {'id': i, 'name': name} for i, name in DECKS.items()}),
    ))
    for index, (front, deck) in enumerate(FRONTS, start=1):
        # 229 tags spread over the 8 notes; the first note also has a nested one: 230
        tags = ' '.join(TAGS[(index - 1) * 29:index * 29] + (['Grammar::Verbs'] if index == 1 else []))
        db.execute('INSERT INTO notes VALUES (?, 100, ?, ?)', (index, f' {tags} ', f'{front}\x1fResposta {front}'))
        db.execute('INSERT INTO cards VALUES (?, ?, ?, 0, 0, 0, 0, 0, 0)', (index, index, deck))
    db.commit()
    db.close()
    with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as apkg:
        apkg.write(db_path, 'collection.anki2')
        apkg.writestr('media', '{}')
