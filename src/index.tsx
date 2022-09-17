import React from './myReact'

const Counter = () => {
  const [state, setState] = React.useState(1)
  return <h1 onClick={() => setState((c: any) => c + 1)}>Count: {state}</h1>
}

const element = <Counter />

const container = document.getElementById('root')
React.render(element, container)
