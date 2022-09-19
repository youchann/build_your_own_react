import React from './myReact'

const Hoge = () => {
  React.useEffect(() => {
    console.log('mounted')
    return () => {
      console.log('unmount')
    }
  }, [])
  return <div>hoge</div>
}

const Counter = () => {
  const [state, setState] = React.useState(1)
  return (
    <h1 onClick={() => setState((c: any) => c + 1)}>
      Count: {state}
      {state < 5 ? <Hoge /> : null}
    </h1>
  )
}

const element = <Counter />

const container = document.getElementById('root')
React.render(element, container)
