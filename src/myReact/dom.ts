function createElement(type: Type, props: Props, ...children: (Fiber | string)[]): Fiber {
  return {
    type,
    props: {
      ...props,
      children: children.map(child => (typeof child === 'object' ? child : createTextElement(child)))
    }
  }
}

function createTextElement(text: string): Fiber {
  return {
    type: 'TEXT_ELEMENT',
    props: {
      nodeValue: text,
      children: []
    }
  }
}

function createDom(fiber: Fiber) {
  if (fiber.type instanceof Function || fiber.type === undefined) return
  const dom = fiber.type === 'TEXT_ELEMENT' ? document.createTextNode('') : document.createElement(fiber.type)
  updateDom(dom, {}, fiber.props)
  return dom
}

// @ts-ignore
const isEvent = (key: string) => key.startsWith('on')
const isProperty = (key: string) => key !== 'children' && !isEvent(key)
const isNew = (prev: Props, next: Props) => (key: string) => prev[key] !== next[key]
const isGone = (_prev: Props, next: Props) => (key: string) => !(key in next)
/** 既にあるDOMを更新する */
function updateDom(dom: DidactHTMLElement, prevProps: Props, nextProps: Props) {
  // MEMO: Remove old or changed event listeners
  Object.keys(prevProps)
    .filter(isEvent)
    .filter(key => !(key in nextProps) || isNew(prevProps, nextProps)(key))
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2)
      dom.removeEventListener(eventType, prevProps[name])
    })

  // MEMO: Add event listeners
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2)
      dom.addEventListener(eventType, nextProps[name])
    })

  // MEMO: Remove old properties
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach(name => {
      dom[name] = ''
    })

  // MEMO: Set new or changed properties
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      dom[name] = nextProps[name]
    })
}

export { createElement, createDom, updateDom }
