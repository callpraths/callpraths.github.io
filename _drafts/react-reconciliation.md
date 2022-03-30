---
layout: post
title:  "React reconciliation"
date:   2022-03-21 00:00:00 +0000
style: react-reconciliation
---

The [React] runtime maintains a tree of Components that maps into the [DOM element tree][dom-tree] in the browser. External events, such as user interaction, cause Component props and state to change. React assimilates these changes in two steps. First, React recreates the  Component tree by calling the Components' `render` method[^1] (or, equivalently, by invoking the functional Component body). Then, React recreates the DOM element tree to match the modified Component tree. React refers to this two-step process as [reconciliation].

I have found that most discussions of reconciliation focus on performance optimizations. Reconciliation occurs frequently. After all, most web applications provide complex user experiences, bridging continuous user interactions to a changing backend data model. In the second step of reconciliation, React reduces costly DOM tree updates by using a heuristic to determine which elements need to be recreated, can be updated in-place, or can be left untouched. You, as a React application developer, have more control on the first step of reconciliation and can write your Components in a way that [avoids][why-does-react-rerender] [re-rendering][common-react-mistakes] them unnecessarily.

**My thesis is that the problems caused by subtle problems in the first step of reconciliation are not limited to performance degradation. Instead, incorrect mapping of React elements across rendering passes can cause correctness issues where the internal state of Components is corrupted or lost.**

The following example brings out the said problem:

<p>
{% highlight jsx linenos %}
ReactDOM.render(
  <App />,
  document.getElementById("app")
);

function App() {
  const [showFirst, setShowFirst] = React.useState(true);
  const toggle = () => setShowFirst(!showFirst);
  return (
      <div>
        <h3>App</h3>
        <button onClick={toggle}>Toggle!</button>
        {showFirst ? (
          <Counter label="First" />
        ) : (
          <Counter label="Second" />
        )}
      </div>
    );
}

function Counter(props) {
  const [count, setCount] = React.useState(0);
  return (
    <div>
      <h3>Counter</h3>
      <button onClick={() => setCount(count + 1)}>+1</button>
      label: {props.label}; count: {count}
    </div>
  );
}
{% endhighlight %}

<div style="width: 100%; display: flex; flex-flow: row wrap; justify-content: center;">
  <div id="app"></div>
</div>
</p>

When this application first renders, React builds the Component tree and a corresponding DOM tree, as follows:

<div style="width: 100%; display: flex; flex-flow: row wrap; justify-content: center;">
<pre>
                                    ┌───────────────────────────┐
Src.line#2  ===> React.App =======> │     DOM.div               │
                    │               │       │                   │
                    │               │       │                   │
                    │               │    ┌──┴───────┬──────┐    │
                    │               │    │          │      │    │
                    │               │ DOM.button DOM.h3    │    │
                    │               └──────────────────────│────┘
                    │               ┌──────────────────────│────┐
                    │               │                   DOM.div │
Src.line#14 ==> React.Counter ====> │                      │    │
                                    │    ┌────────────┬────┘    │
                                    │ DOM.h3       DOM.button   │
                                    │                           │
                                    └───────────────────────────┘
Key:
    Src.line#* : Source code line number
    React.*    : React Component
    DOM.*      : DOM element
</pre>
</div>


Initially, the first step of reconciliation maps the `<App/>` on line 2 in the source code to a new `React.App` Component, and the `<Counter/>` on line 14 to a new `React.Counter` component in the Component tree. The second step of reconciliation creates new DOM elements corresponding to these React Components.

When you click `Toggle!`, the button's `onClick` handler sets `showFirst` to `false`, updating the state of the `App` Component. Thus, React needs to render `App` again. Consider the first step of reconciliation when React rerenders  `App`. `showFirst` is now `false`. Therefore, `App` returns `Counter` from source code line 16 instead of 14. Now, the React runtime must choose between two options:

1. Create a new `React.Counter` Component mapped to source code line 16, replacing the one from line 14 in the Component tree.
2. Map source code line 16 to the existing `React.Counter` component.

Similar to the heuristics used to map the Component tree into DOM in the second phase, React uses a heuristic to pick between the two options. Herein lies the surprise: Unlike the decision to recreate, update, or skip DOM element updates, the two options above are semantically distinct. Option 1 resets the internal state of the `React.Counter` Component (setting the counter back to 0) while option 2 preserves its internal state. In this case, the React runtime chooses the second option. You can observe this in the inline component above: Click `+1` a few times to increment the counter and observe how `Toggle!` fails to reset the count to 0.

This is the fundamental problem that exists in both steps of reconciliation: There is no explicit mapping from source code (Component tree, for the second step) to the Component tree (DOM tree, for the second step). React must sometimes choose between options using heuristics designed to maximize rendering performance. In reconciliation's second step, a failure of the mapping heuristic simply leads to sub-optimal performance, as [described in the official documentation][react-docs-recurse-on-children], but as my example above shows, the same problem in the first step can result in surprising functionality.

There is inadequate explanation of this problem in the official documentation, but it [hints at the problem][react-docs-correctness-issue] in the context of arrays:

> Reorders can also cause issues with component state when indexes are used as keys. Component instances are updated and reused based on their key. If the key is an index, moving an item changes it. As a result, component state for things like uncontrolled inputs can get mixed up and updated in unexpected ways.

The quote above references `keys` -- React's solution to this performance, and correctness, problem. You can provide explicit keys when constructing a Component in the source code. When you provide a key for a Component, the React runtime disables the mapping heuristic in the first step of reconciliation. Instead, it always identifies Components with an explicit key across rendering passes.

The most common case where the heuristic fails is when a Component contains a list of child Components of identical type. In this case, the React runtime maps the child Components serially and is unable to maintain the mapping if a Component is inserted in the middle of the list, or if the Components are reordered. This case is so common that the React runtime [warns you][react-docs-list-warning] if it finds a list of Components without explicit keys.

> When you run this code, you’ll be given a warning that a key should be provided for list items. A “key” is a special string attribute you need to include when creating lists of elements.

My example shows that, with conditional rendering, the problem extends beyond just arrays. This example may seem artificial to you, but it is a simplified form of a [bug I found][acs-sample-bug] in an Azure Communication Services sample application. The incorrectly mapped child Component was a [React Context][react-docs-context]. Two locations 20 lines apart created the same Context -- first for a configuration page and then for the main page of the application. The Context stored a property as state that was initialized via props. This property was updated on the configuration page. The intention of the developers was to create a new Context for the main page supplying the new value of the property via props. But React simply updated the Context Component when the main page was rendered and the state value of the Context was never initialized with the new props.

I'll finish by noting my dissent to the [concluding section][react-docs-reconciliation-tradeoff] in the official documentation that says that reconciliation is an implementation detail and that the cost of developer confusion about reconciliation is _merely_ worse rendering performance. The behavior of stateful Components depends on whether the React runtime preserves the Component in the Component tree across rendering passes. And this decision can be slave to the heuristics of reconciliation. This abstraction is [definitely leaky][leaky-abstractions].

[^1]: React calls several lifecycle methods on the Component. The exact sequence of method calls for each Component is not relevant here. For more details see [this excellent gitbook on Component lifecycle][component-lifecycle-gitbook].

[acs-sample-bug]: https://github.com/Azure/communication-ui-sdk/pull/224
[common-react-mistakes]: https://medium.com/strands-tech-corner/3-common-mistakes-that-impede-react-reconciliation-and-updating-processes-8b917ebde61e
[component-lifecycle-gitbook]: https://developmentarc.gitbooks.io/react-indepth/content/life_cycle/introduction.html
[dom-tree]: https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Introduction
[leaky-abstractions]: https://www.joelonsoftware.com/2002/11/11/the-law-of-leaky-abstractions/
[react-docs-conditional-rendering]: https://reactjs.org/docs/conditional-rendering.html
[react-docs-context]: https://reactjs.org/docs/context.html
[react-docs-correctness-issue]: https://reactjs.org/docs/reconciliation.html#keys
[react-docs-list-warning]: https://reactjs.org/docs/lists-and-keys.html#basic-list-component
[react-docs-reconciliation-tradeoff]: https://reactjs.org/docs/reconciliation.html#tradeoffs
[react-docs-recurse-on-children]: https://reactjs.org/docs/reconciliation.html#recursing-on-children
[React]: https://reactjs.org/
[reconciliation]: https://reactjs.org/docs/reconciliation.html
[why-does-react-rerender]: https://medium.com/@Osterberg/react-component-renders-too-often-2917daabcf5

<!-- Keep in the end for optimal page loading. Can't defer loading React because of how I use it -->

<script crossorigin src="https://unpkg.com/react@17/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@17/umd/react-dom.production.min.js"></script>
<script>
"use strict";
function App() {
  const [showFirst, setShowFirst] = React.useState(true);
  return React.createElement(
    "div",
    {
      style: {
        padding: "1rem",
        border: "1px solid #999",
        width: "20rem",
        display: "flex",
        flexFlow: "column nowrap",
        alignContent: "center",
        gap: "1rem",
      }
    },
    React.createElement("h4", null, "App"),
    React.createElement(
      "button",
      {
        onClick: () => setShowFirst(!showFirst),
        style: {
          minHeight: "1.25rem",
          backgroundColor: "#AAA",
        }
      },
      React.createElement("h4", null, "Toggle!")
    ),
    showFirst
      ? React.createElement(Counter, {
          label: "First"
        })
      : React.createElement(Counter, {
          label: "Second"
        })
  );
}
function Counter(props) {
  const [count, setCount] = React.useState(0);
  return React.createElement(
    "div",
    {
      style: {
        padding: "1rem",
        border: "1px solid #999",
        display: "flex",
        flexFlow: "column nowrap",
        alignContent: "center",
        gap: "1rem",
      }
    },
    React.createElement(
      "h4",
      null,
      "Counter"
    ),
    React.createElement(
      "button",
      {
        onClick: () => setCount(count + 1),
        style: {
          minHeight: "1.25rem",
          backgroundColor: "#AAA",
        }
      },
      React.createElement("h4", null, "+1"),
    ),
    "label: ",
    props.label,
    "; count: ",
    count
  );
}
ReactDOM.render(
  React.createElement(App, null),
  document.getElementById("app")
);

</script>