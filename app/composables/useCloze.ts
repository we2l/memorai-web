const clozePattern = /\{\{c(\d+)::([\s\S]*?)(?:::([\s\S]+?))?\}\}/g
const wrapperPattern = /\[\[r::([\s\S]+?)\]\]/g

export function useCloze() {
  function stripWrappers(text: string): string {
    return text.replace(wrapperPattern, '$1')
  }

  function renderQuestion(text: string, clozeIndex?: number): string {
    return stripWrappers(text).replace(clozePattern, (_match, num, _answer, hint) => {
      if (clozeIndex !== undefined && parseInt(num) !== clozeIndex) {
        return _answer
      }
      return `<span class="cloze-blank">${hint || '...'}</span>`
    })
  }

  function renderAnswer(text: string, clozeIndex?: number): string {
    return stripWrappers(text).replace(clozePattern, (_match, num, answer) => {
      if (clozeIndex !== undefined && parseInt(num) !== clozeIndex) {
        return answer
      }
      return `<strong class="cloze-answer">${answer}</strong>`
    })
  }

  return { renderQuestion, renderAnswer }
}
