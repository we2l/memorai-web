#!/usr/bin/env python3
"""Fontes da Fraunces do app (ADR-035 §2): os números grandes e o itálico do cartão da prova.

Uso: python3 scripts/fonts/build-num-font.py [--roman Fraunces.ttf] [--italic Fraunces-Italic.ttf]
Sem os arquivos, baixa as fontes variáveis do google/fonts (URL fixa) e confere o sha256.
Requer fonttools e brotli (pip install fonttools brotli). Licença: OFL 1.1 (scripts/fonts/OFL-Fraunces.txt).
Saída: app/assets/fonts/baigi-num-600.woff2 (dígitos e "% + − , . º", no precache),
       app/assets/fonts/baigi-num-400.woff2 (os mesmos glifos no peso normal, o número secundário do hub, ADR-037;
       fora do precache, globIgnores) e
       app/assets/fonts/baigi-it-500.woff2 (minúsculas, acentos e pontuação; fora do precache, globIgnores).
"""
import argparse
import hashlib
import io
import sys
import urllib.request
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'app/assets/fonts'
# O sha256 trava a versão: se o google/fonts mudar o arquivo, o script para em vez de gerar outra fonte
BASE = 'https://github.com/google/fonts/raw/main/ofl/fraunces/'
SOURCES = {
    'roman': ('Fraunces%5BSOFT,WONK,opsz,wght%5D.ttf', '177ff6c0f14e5550a3c624247cd1189611d4eb65d000b14944c63d967958abbb'),
    'italic': ('Fraunces-Italic%5BSOFT,WONK,opsz,wght%5D.ttf', 'b24448c43702fac4ee856781d461a0dfba8d8e594b6e8e190234b75fed2c0e01'),
}
# Espaço, %, +, vírgula, ponto, dígitos, º e o sinal de menos (U+2212): o unicode-range do @font-face "Baigi Num"
NUM_UNICODES = 'U+0020,U+0025,U+002B,U+002C,U+002E,U+0030-0039,U+00BA,U+2212'
# Minúsculas, acentos do PT-BR, pontuação, travessão, aspas curvas e reticências
IT_UNICODES = 'U+0020-002F,U+003A-003F,U+0061-007A,U+00E0-00E3,U+00E7,U+00E9-00EA,U+00ED,U+00F3-00F5,U+00FA,U+00FC,U+2013-2014,U+2018-201D,U+2026'
AXES = {'opsz': 72, 'SOFT': 50, 'WONK': 0}


def load(kind: str, path: str | None) -> bytes:
    name, sha = SOURCES[kind]
    data = Path(path).read_bytes() if path else urllib.request.urlopen(BASE + name, timeout=60).read()
    digest = hashlib.sha256(data).hexdigest()
    if digest != sha:
        sys.exit(f'{kind}: sha256 {digest} diferente do esperado {sha}')
    return data


def build(data: bytes, weight: int, unicodes: str, features: str, out: Path) -> None:
    font = instancer.instantiateVariableFont(TTFont(io.BytesIO(data)), {'wght': weight, **AXES})
    options = subset.Options()
    options.flavor = 'woff2'
    options.layout_features = features.split(',')
    options.name_IDs = ['1', '2']
    options.notdef_outline = False
    options.hinting = False
    sub = subset.Subsetter(options)
    sub.populate(unicodes=subset.parse_unicodes(unicodes))
    sub.subset(font)
    out.parent.mkdir(parents=True, exist_ok=True)
    subset.save_font(font, str(out), options)
    print(f'{out.relative_to(ROOT)}: {out.stat().st_size} bytes')


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--roman')
    parser.add_argument('--italic')
    args = parser.parse_args()
    roman = load('roman', args.roman)
    build(roman, 600, NUM_UNICODES, 'tnum,lnum,kern', OUT / 'baigi-num-600.woff2')
    build(roman, 400, NUM_UNICODES, 'tnum,lnum,kern', OUT / 'baigi-num-400.woff2')
    build(load('italic', args.italic), 500, IT_UNICODES, 'kern,liga', OUT / 'baigi-it-500.woff2')


if __name__ == '__main__':
    main()
