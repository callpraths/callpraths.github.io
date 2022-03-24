---
layout: post
title:  "React reconciliation"
date:   2022-03-21 00:00:00 +0000
style: react-reconciliation
---

In a React web application, the React runtime maintains a tree of React elements. At a single point in time, the React element tree maps into the DOM element tree maintained by the browser. External events, such as user interaction, cause Component props and state to change. React assimilates these changes in two steps. First, React recreates the React element tree by calling the Components' `render` method[1] (or, equivalently, by invoking the functional Component body). Then, React recreates the DOM element tree to match the modified React element tree. React refers to this two-step process as reconciliation.

Reconciliation occurs very frequently. After all, most web applications provide complex user experiences, bridging continuous user interactions to a changing backend data model. Updating the DOM element tree is computationally far costlier than updating the Component tree. Thus, avoiding unnecessary DOM element updates is essential for a responsive web application. Indeed, in the second step of reconciliation, React implements a fast heuristic algorithm to determine which DOM elements can be updated in-place instead of being recreated, and which DOM elements can be left untouched. React application developers can also prevent DOM element updates by avoiding reconciliation entirely. See one of [several][why-does-react-rerender] [blog-posts][common-react-mistakes] describing how you can avoid re-rendering Components.

I have found that discussions of React application performance focus on the two approaches mentioned above: application developers avoid props and state changes, thereby preventing reconciliation entirely, and React efficiently maps the Component tree into DOM elements to minimize DOM updates. They ignore the intermediate step where React recreates the React element tree -- and the performance optimization pitfalls that entails. Consider the following example application:

```jsx
class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      value: false,
    };
  }

  render() {
    const toggle = () => {
      this.setState({
        value: !this.state.value,
      });
    };

    return (
      <div>
        <button onClick={toggle}>Toggle!</button>
        <Stateful />
      </div>
    );
  }
}

class Stateful extends React.Component {
  render() {
    return <h1>I am Stateful</h1>;
  }
}
```

[View on codepen](https://codepen.io/callpraths/pen/OJpXLJN)

When this application first renders, React builds the React element tree and a corresponding DOM tree, as follows:

                        ┌─────────────┐
    React.App ========► │     DOM.div │
        |               │       │     │
        |               │       │     │
        |               │    ┌──┴─────┼──┐
        |               │    │        │  │
        |               │ DOM.button  │  │
        |               └─────────────┘  │
        |                                │
        |                           ┌────┼───┐
    React.Stateful ===============► │    │   │
                                    │ DOM.h1 │
                                    └────────┘

    Key:
        React.* : React elements
        DOM.*   : DOM elements

When the user clicks the `Toggle!` button, the button's `onClick` handler updates the state of the `App` Component. Thus, React needs to render the `App` Component again. Consider what happens when React calls the `render()` method for the `App` component: A new `React.Stateful` React element is created. React elements are javascript objects. The new `React.Stateful` element does not have any inherent relationship to the `React.Stateful` React element constructed in the first render. During reconciliation, React must determine if this `React.Stateful` element maps to an existing DOM element. To do so, React, heuristically, maps the new `React.Stateful` React element to that created in the first render, and then maps it to the corresponding DOM element. Herein lies an opportunity for sub-optimal rendering performance: under some circumstances, React can fail to correctly map the newly constructed React elements to those constructed originally and unnecessarily update corresponding DOM elements. React official documentation [explains this problem][react-docs-recurse-on-children], but the example (and, for the most part, the prose) only shows React's inability to map DOM elements generated from a single Component across two rendering passes.

In fact, this problem is exacerbated for React elements with multiple child React elements of the same type -- React's heuristic for mapping the React elements across rendering passes fails, and this can cause problems. **My main thesis is that the problems caused by the failure of this heuristic are not limited to performance degradation. Instead, incorrect mapping of React elements across rendering passes can cause correctness issues where the internal state of Components is corrupted or lost.** React official documentation [hints at this problem][react-docs-correctness-issue]:

> Reorders can also cause issues with component state when indexes are used as keys. Component instances are updated and reused based on their key. If the key is an index, moving an item changes it. As a result, component state for things like uncontrolled inputs can get mixed up and updated in unexpected ways.

The quote above references `keys`, React's solution to this performance, and correctness, problem. Developers can provide explicit keys for constructed React elements. React always maps a React element with a developer provided key to an element from the earlier rendering pass with the same key. This way, developers can ensure that React correctly maps elements across rendering passes when React's internal heuristic is likely to fail. The most common case where the heuristic fails is when a Component renders a list of child Components of identical type. In this case, React maps the React elements generated by the child Components serially. Thus, React is unable to maintain the mapping if an element is inserted in the middle of the list, or if the list elements are reordered. This case is so common that react [warns developers][react-docs-list-warning] if it finds a list of React elements with explicit keys.

> When you run this code, you’ll be given a warning that a key should be provided for list items. A “key” is a special string attribute you need to include when creating lists of elements.

As the next example shows, React can fail to correctly map React elements across rendering passes even in the absence of lists.

```jsx
class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      value: false,
    };
  }

  render() {
    const toggle = () => {
      this.setState({
        value: !this.state.value,
      });
    };

    return (
      <div>
        <button onClick={toggle}>Toggle!</button>
        {this.state.value ? (
          <Stateful label="first" /> // Note [1]
        ) : (
          <Stateful label="second" /> // Note [2]
        )}
      </div>
    );
  }
}

class Stateful extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      count: 0,
    };
  }

  render() {
    const increment = () => {
      this.setState({
        count: this.state.count + 1,
      });
    };

    return (
      <div>
        <button onClick={increment}>Local increment?</button>
        <br />
        <h1>
          Current showing {this.props.label} Stateful count: {this.state.count}
        </h1>
      </div>
    );
  }
}
```

[View on codepen](https://codepen.io/callpraths/pen/mdWEbOe)

This is an extension of my original example. The `Stateful` Component now implements a counter that increments when user clicks the `Local increment?` button. Additionally, The `App` Component now [conditionally renders][react-docs-conditional-rendering] `Stateful` with different labels on lines marked `Note [1]` or `Note [2]`. The user can toggle the conditional rendering logic by clicking the `Toggle!` button. Even though the line of code that is enabled in `App`'s `render` method changes when `Toggle!` is clicked, the constructed React element is of the same type - `Stateful`. Further, this is the only React child element of the `App` React element in either case. Even after a `Toggle!`, React maps the newly constructed `Stateful` element to the existing element, maintaining `Stateful`'s internal state, and the counter continues incrementing beyond the `Toggle!` without ever resetting to 0.

My last example showed that, with conditional rendering, React may update a previously constructed React element for a Component instead of creating a new element, even though the original construction and the update are generated from different locations in the source code. This behaviour can be surprising to developers. My example may seem artificial to you, but it is a simplified form of a [bug I found][acs-sample-bug] in an Azure Communication Services sample application. The incorrectly mapped child Component was a [React Context][react-docs-context]. Two locations 20 lines apart created the same Context -- first for a configuration page and then for the main page of the applciation. The Context stored a certain property as state that was initialized via props. This property was updated on the configuration page. The intention of the developers was to create a new Context for the main page supplying the new value of the property via props. But React simply updated the Context element when the main page was rendered and the state value of the Context was never initialized with the new props.

I said earlier that React sometimes fails to map React elements across rendering passes correctly. This isn't quite true. Unless developers provide explicit keys for all generated React elements, there is no correct mapping of React elements across two rendering passes. Both the mapping between React elements across two rendering passes, and the mapping of React elements to DOM elements are React's internal mechanisms to avoid recreating the entire DOM element tree on each rendering pass. If an application only uses pure React Components - Components without internal state - then these mechanisms are only a performance optimization technique, and the final DOM element tree is the same regardless of these optimization. As the [concluding section][react-docs-reconciliation-tradeoff] in React official docs state, the cost of developer confusion is _merely_ worse rendering performance. But when a Component generates a React element that holds internal state, the behaviour of the application depends on whether React constructs a new element or updates an existing element. And this decision is slave to the heuristics of reconciliation.

[1]: React calls several lifecycle methods on the Component. The exact sequence of method calls for each Component is not relevant here. For more details see [an excellent gitbook on Component lifecycle][component-lifecycle-gitbook].

[acs-sample-bug]: https://github.com/Azure/communication-ui-sdk/pull/224
[common-react-mistakes]: https://medium.com/strands-tech-corner/3-common-mistakes-that-impede-react-reconciliation-and-updating-processes-8b917ebde61e
[component-lifecycle-gitbook]: https://developmentarc.gitbooks.io/react-indepth/content/life_cycle/introduction.html
[react-docs-correctness-issue]: https://reactjs.org/docs/reconciliation.html#keys
[react-docs-conditional-rendering]: https://reactjs.org/docs/conditional-rendering.html
[react-docs-context]: https://reactjs.org/docs/context.html
[react-docs-list-warning]: https://reactjs.org/docs/lists-and-keys.html#basic-list-component
[react-docs-reconciliation-tradeoff]: https://reactjs.org/docs/reconciliation.html#tradeoffs
[react-docs-recurse-on-children]: https://reactjs.org/docs/reconciliation.html#recursing-on-children
[why-does-react-rerender]: https://medium.com/@Osterberg/react-component-renders-too-often-2917daabcf5