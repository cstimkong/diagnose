# Diagnose

### Installation

run the command `npm install` to install the dependencies.

### How to use

- Generate object relation graph for a library

Run the command

```
node construct-graph.js --library <library path> [--output <model path>] [--max-iteration <number>] [--max-execution-time <number>] [--max-argument-count <number>]
```

The library path should be a commonJS module (packaged UMD modules are also OK) or a single JavaScript file.


- Reconstruct object relation graph for a library

Run the command

```
node reconstruct-graph.js --library <library path> --graph <graph path>
```


### JSON Data format of Dynamic Object Relation Graph

The JSON data of a graph is a list of node in the graph. Each item is an object with properties `id`, `type` and `edges`, where `type` can be `start`, `object` or `type`, and `edges` is an array containing several items. Each edge should contain `type` property. The schema is defined in `schema.json`.

The example of a dynamic object relation graph is shown as follows:

```javascript
{
    "nodes": [
        {
            "id": 0,
            "type": "start",
            "edges": [
                {
                    "type": "ownProp",
                    "name": "test",
                    "target": {"nodeId": 1}
                }
            ]
        },
        {
            "id": 1,
            "type": "object",
            "edges": [
                {
                    "type": "ownProp",
                    "name": "hello",
                    "target": {"nodeId": 2}
                },
                {
                    "type": "call",
                    "data": "'abc'",
                    "target": {"nodeId": 3}
                }
            ]
        },
        {
            "id": 2,
            "type": "object",
            "edges": []
        },
        {
            "id": 3,
            "type": "type",
            "edges": [
                {
                    "type": "hasProp",
                    "name": "ID",
                    "target": "String"
                },
                {
                    "type": "hasProp",
                    "name": "[[Prototype]]",
                    "target": {"nodeId": 2}
                }
            ]
        }
    ]
}
```
