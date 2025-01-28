import { readFileSync } from "fs";

import { NJSON, NjsonFunction } from "../index";

interface Func {
  calls: string;
  contexts: string;
  func: NjsonFunction;
}

interface RefTest {
  evaluated: string;
  replacer: Func;
  reviver: Func;
  stringified: string;
  value: unknown;
}

function noop(_: number | string, value: unknown) {
  return value;
}

// circular objects
const object1: Record<string, unknown> = { njson: "test" };
const object2 = { object1, test: "njson" };
object1.object2 = object2;

const circular_objects = {
  evaluated: '((A)=>{return Object.assign(A,{"object2":{"object1":A,"test":"njson"}})})({"njson":"test"})',
  replacer:  {
    calls:    '((A,B)=>{return [["",Object.assign(A,{"object2":Object.assign(B,{"object1":A})})],["njson","test"],["object2",B],["object1",A],["test","njson"]]})({"njson":"test"},{"test":"njson"})',
    contexts: '((A,B)=>{return [{"":Object.assign(A,{"object2":Object.assign(B,{"object1":A})})},A,A,B,B]})({"njson":"test"},{"test":"njson"})',
    func:     noop
  },
  reviver: {
    calls:    '((A,B)=>{return [["njson","test"],["object1",Object.assign(A,{"object2":Object.assign(B,{"object1":A})})],["test","njson"],["object2",B],["",A]]})({"njson":"test"},{"test":"njson"})',
    contexts: '((A,B)=>{return [Object.assign(A,{"object2":Object.assign(B,{"object1":A})}),B,B,A,{"":A}]})({"njson":"test"},{"test":"njson"})',
    func:     noop
  },
  stringified: '((A)=>{return Object.assign(A,{"object2":{"object1":A,"test":"njson"}})})({"njson":"test"})',
  value:       object1
};

// circular arrays
const array1 = [23, 0 as unknown, 42];
const array2 = [1, 2, array1, 3];
const object3 = { array1, array2 };
array1[1] = array2;

const circular_arrays = {
  evaluated: '((A,B)=>{A.push(B,42);B.push(A,3);return {"array1":A,"array2":B}})([23],[1,2])',
  replacer:  {
    calls:    '((A,B)=>{A.push(B,42);B.push(A,3);return [["",{"array1":A,"array2":B}],["array1",A],["0",23],["1",B],["0",1],["1",2],["2",A],["3",3],["2",42],["array2",B]]})([23],[1,2])',
    contexts: '((A,B,C)=>{A.push(B,42);B.push(A,3);return [{"":Object.assign(C,{"array1":A,"array2":B})},C,A,A,B,B,B,B,A,C]})([23],[1,2],{})',
    func:     noop
  },
  reviver: {
    calls:    '((A,B)=>{A.push(B,42);B.push(A,3);return [["0",23],["0",1],["1",2],["2",A],["3",3],["1",B],["2",42],["array1",A],["array2",B],["",{"array1":A,"array2":B}]]})([23],[1,2])',
    contexts: '((A,B,C)=>{A.push(B,42);B.push(A,3);return [A,B,B,B,B,A,A,Object.assign(C,{"array1":A,"array2":B}),C,{"":C}]})([23],[1,2],{})',
    func:     noop
  },
  stringified: '((A,B)=>{A.push(B,42);B.push(A,3);return {"array1":A,"array2":B}})([23],[1,2])',
  value:       object3
};

// circular sets
const set1 = new Set<unknown>(["njson"]);
const set2 = new Set([23, 42, set1, { test: "njson" }]);
set1.add(set2);
set1.add(new Int8Array([23, 42]));

const circular_sets = {
  evaluated: '((A)=>{return A.add(new Set([23,42,A,{"test":"njson"}])).add(new Int8Array([23,42]))})(new Set(["njson"]))',
  replacer:  {
    calls:
      '((A,B,C,D)=>{return [["",A.add(B.add(A).add(C)).add(D)],[0,"njson"],[1,B],[0,23],[1,42],[2,A],[3,C],["test","njson"],[2,D]]})(new Set(["njson"]),new Set([23,42]),{"test":"njson"},new Int8Array([23,42]))',
    contexts: '((A,B,C)=>{return [{"":A.add(B.add(A).add(C)).add(new Int8Array([23,42]))},A,A,B,B,B,B,C,A]})(new Set(["njson"]),new Set([23,42]),{"test":"njson"})',
    func:     noop
  },
  reviver: {
    calls:
      '((A,B,C,D)=>{return [[0,"njson"],[0,23],[1,42],[2,A.add(C.add(A).add(B)).add(D)],["test","njson"],[3,B],[1,C],[2,D],["",A]]})(new Set(["njson"]),{"test":"njson"},new Set([23,42]),new Int8Array([23,42]))',
    contexts: '((A,B,C)=>{return [A.add(B.add(A).add(C)).add(new Int8Array([23,42])),B,B,B,C,B,A,A,{"":A}]})(new Set(["njson"]),new Set([23,42]),{"test":"njson"})',
    func:     noop
  },
  stringified: '((A)=>{return A.add(new Set([23,42,A,{"test":"njson"}])).add(new Int8Array([23,42]))})(new Set(["njson"]))',
  value:       set1
};

// circular maps
const object4 = { test: "njson" };
const array3 = ["test", "njson"] as const;
const map1 = new Map<unknown, unknown>([[1, 2]]);
const map2 = new Map<unknown, unknown>([array3, [{}, map1], [object4, 3]]);
const map3 = new Map<unknown, unknown>([[[], object4], [map1, 4], array3]);
map1.set(5, map2);
map1.set(...array3);
map1.set(map3, array3);
map1.set(6, object4);

const circular_maps = {
  evaluated:
    '((A,B)=>{return B.set(5,new Map([["test","njson"],[{},B],[A,3]])).set("test","njson").set(new Map([[[],A],[B,4],["test","njson"]]),["test","njson"]).set(6,A)})({"test":"njson"},new Map([[1,2]]))',
  replacer: {
    calls:
      '((A,B,C,D,E,F,G)=>{return [["",B.set(5,C.set(D,B).set(A,3)).set("test","njson").set(E.set(G,A).set(B,4).set("test","njson"),F).set(6,A)],[0,[1,2]],[1,[5,C]],[0,["test","njson"]],[1,[D,B]],[2,[A,3]],["test","njson"],[2,["test","njson"]],[3,[E,F]],[0,[G,A]],[1,[B,4]],[2,["test","njson"]],["0","test"],["1","njson"],[4,[6,A]]]})({"test":"njson"},new Map([[1,2]]),new Map([["test","njson"]]),{},new Map(),["test","njson"],[])',
    contexts:
      '((A,B,C,D,E)=>{return [{"":B.set(5,C.set({},B).set(A,3)).set("test","njson").set(D.set([],A).set(B,4).set("test","njson"),E).set(6,A)},B,B,C,C,C,A,B,B,D,D,D,E,E,B]})({"test":"njson"},new Map([[1,2]]),new Map([["test","njson"]]),new Map(),["test","njson"])',
    func: noop
  },
  reviver: {
    calls:
      '((A,B,C,D,E,F,G)=>{return [[0,[1,2]],[0,["test","njson"]],[1,[A,C.set(5,D.set(A,C).set(B,3)).set("test","njson").set(F.set(E,B).set(C,4).set("test","njson"),G).set(6,B)]],["test","njson"],[2,[B,3]],[1,[5,D]],[2,["test","njson"]],[0,[E,B]],[1,[C,4]],[2,["test","njson"]],["0","test"],["1","njson"],[3,[F,G]],[4,[6,B]],["",C]]})({},{"test":"njson"},new Map([[1,2]]),new Map([["test","njson"]]),[],new Map(),["test","njson"])',
    contexts:
      '((A,B,C,D,E)=>{return [B.set(5,C.set({},B).set(A,3)).set("test","njson").set(D.set([],A).set(B,4).set("test","njson"),E).set(6,A),C,C,A,C,B,B,D,D,D,E,E,B,B,{"":B}]})({"test":"njson"},new Map([[1,2]]),new Map([["test","njson"]]),new Map(),["test","njson"])',
    func: noop
  },
  stringified:
    '((A,B)=>{return B.set(5,new Map([["test","njson"],[{},B],[A,3]])).set("test","njson").set(new Map([[[],A],[B,4],["test","njson"]]),["test","njson"]).set(6,A)})({"test":"njson"},new Map([[1,2]]))',
  value: map1
};

// circular mixed
const object5 = { njson: "test" };
const array4: unknown[] = [1, object5];
const set3 = new Set<unknown>(["a", object5, array4]);
const map4 = new Map<unknown, unknown>([
  ["A", "njson"],
  ["B", object5],
  [array4, set3]
]);
Object.assign(object5, { array4, map4, object5, set3 });
array4.push(map4, set3, array4);
set3.add(map4);

const circular_mixed_1 = {
  evaluated:
    '((A,B,C,D)=>{B.push(Object.assign(A,{"array4":B,"map4":C.set("B",A).set(B,D.add(A).add(B).add(C)),"object5":A,"set3":D}),C,D,B);return A})({"njson":"test"},[1],new Map([["A","njson"]]),new Set(["a"]))',
  replacer: {
    calls:
      '((A,B,C,D)=>{B.push(Object.assign(A,{"array4":B,"map4":C.set("B",A).set(B,D.add(A).add(B).add(C)),"object5":A,"set3":D}),C,D,B);return [["",A],["njson","test"],["array4",B],["0",1],["1",A],["2",C],[0,["A","njson"]],[1,["B",A]],[2,[B,D]],[0,"a"],[1,A],[2,B],[3,C],["3",D],["4",B],["map4",C],["object5",A],["set3",D]]})({"njson":"test"},[1],new Map([["A","njson"]]),new Set(["a"]))',
    contexts:
      '((A,B,C,D)=>{B.push(Object.assign(A,{"array4":B,"map4":C.set("B",A).set(B,D.add(A).add(B).add(C)),"object5":A,"set3":D}),C,D,B);return [{"":A},A,A,B,B,B,C,C,C,D,D,D,D,B,B,A,A,A]})({"njson":"test"},[1],new Map([["A","njson"]]),new Set(["a"]))',
    func: noop
  },
  reviver: {
    calls:
      '((A,B,C,D)=>{B.push(Object.assign(A,{"array4":B,"map4":C.set("B",A).set(B,D.add(A).add(B).add(C)),"object5":A,"set3":D}),C,D,B);return [["njson","test"],["0",1],["1",A],[0,["A","njson"]],[1,["B",A]],[0,"a"],[1,A],[2,B],[3,C],[2,[B,D]],["2",C],["3",D],["4",B],["array4",B],["map4",C],["object5",A],["set3",D],["",A]]})({"njson":"test"},[1],new Map([["A","njson"]]),new Set(["a"]))',
    contexts:
      '((A,B,C,D)=>{B.push(Object.assign(A,{"array4":B,"map4":C.set("B",A).set(B,D.add(A).add(B).add(C)),"object5":A,"set3":D}),C,D,B);return [A,B,B,C,C,D,D,D,D,C,B,B,B,A,A,A,A,{"":A}]})({"njson":"test"},[1],new Map([["A","njson"]]),new Set(["a"]))',
    func: noop
  },
  stringified:
    '((A,B,C,D)=>{B.push(Object.assign(A,{"array4":B,"map4":C.set("B",A).set(B,D.add(A).add(B).add(C)),"object5":A,"set3":D}),C,D,B);return A})({"njson":"test"},[1],new Map([["A","njson"]]),new Set(["a"]))',
  value: object5
};

const circular_mixed_2 = {
  evaluated:
    '((A,B,C,D)=>{C.push(Object.assign(A,{"array4":C,"map4":B.set("B",A).set(C,D.add(A).add(C).add(B)),"object5":A,"set3":D}),B,D,C);return B})({"njson":"test"},new Map([["A","njson"]]),[1],new Set(["a"]))',
  replacer: {
    calls:
      '((A,B,C,D)=>{C.push(Object.assign(A,{"array4":C,"map4":B.set("B",A).set(C,D.add(A).add(C).add(B)),"object5":A,"set3":D}),B,D,C);return [["",B],[0,["A","njson"]],[1,["B",A]],["njson","test"],["array4",C],["0",1],["1",A],["2",B],["3",D],[0,"a"],[1,A],[2,C],[3,B],["4",C],["map4",B],["object5",A],["set3",D],[2,[C,D]]]})({"njson":"test"},new Map([["A","njson"]]),[1],new Set(["a"]))',
    contexts:
      '((A,B,C,D)=>{C.push(Object.assign(A,{"array4":C,"map4":B.set("B",A).set(C,D.add(A).add(C).add(B)),"object5":A,"set3":D}),B,D,C);return [{"":B},B,B,A,A,C,C,C,C,D,D,D,D,C,A,A,A,B]})({"njson":"test"},new Map([["A","njson"]]),[1],new Set(["a"]))',
    func: noop
  },
  reviver: {
    calls:
      '((A,B,C,D)=>{B.push(Object.assign(A,{"array4":B,"map4":C.set("B",A).set(B,D.add(A).add(B).add(C)),"object5":A,"set3":D}),C,D,B);return [[0,["A","njson"]],["njson","test"],["0",1],["1",A],["2",C],[0,"a"],[1,A],[2,B],[3,C],["3",D],["4",B],["array4",B],["map4",C],["object5",A],["set3",D],[1,["B",A]],[2,[B,D]],["",C]]})({"njson":"test"},[1],new Map([["A","njson"]]),new Set(["a"]))',
    contexts:
      '((A,B,C,D)=>{C.push(Object.assign(A,{"array4":C,"map4":B.set("B",A).set(C,D.add(A).add(C).add(B)),"object5":A,"set3":D}),B,D,C);return [B,A,C,C,C,D,D,D,D,C,C,A,A,A,A,B,B,{"":B}]})({"njson":"test"},new Map([["A","njson"]]),[1],new Set(["a"]))',
    func: noop
  },
  stringified:
    '((A,B,C,D)=>{C.push(Object.assign(A,{"array4":C,"map4":B.set("B",A).set(C,D.add(A).add(C).add(B)),"object5":A,"set3":D}),B,D,C);return B})({"njson":"test"},new Map([["A","njson"]]),[1],new Set(["a"]))',
  value: map4
};

// long strings
const str = "long string";
const array5 = [[str], str];
(array5[0] as unknown[]).push(array5);

const long_strings = {
  evaluated: '((A,B)=>{B.push([A,B],A);return B})("long string",[])',
  replacer:  {
    calls:    '((A,B,C)=>{B.push(C,A);C.push(A,B);return [["",B],["0",C],["0",A],["1",B],["1",A]]})("long string",[],[])',
    contexts: '((A,B,C)=>{B.push(C,A);C.push(A,B);return [{"":B},B,C,C,B]})("long string",[],[])',
    func:     noop
  },
  reviver: {
    calls:    '((A,B,C)=>{B.push(C,A);C.push(A,B);return [["0",A],["1",B],["0",C],["1",A],["",B]]})("long string",[],[])',
    contexts: '((A,B,C)=>{B.push(A,C);C.push(B,A);return [B,B,C,C,{"":C}]})("long string",[],[])',
    func:     noop
  },
  stringified: '((A,B)=>{B.push([A,B],A);return B})("long string",[])',
  value:       array5
};

// repeated references
const buffer = Buffer.from("njson");
const map6 = new Map();
const set4 = new Set(["njson"]);
const array6 = [new Set(), new Map(), buffer, map6, set4, buffer, map6, set4];

const repeated_references = {
  evaluated: '((A,B,C)=>{return [new Set(),new Map(),A,B,C,A,B,C]})(new Uint8Array([110,106,115,111,110]),new Map(),new Set(["njson"]))',
  replacer:  {
    calls:
      '((A,B,C,D,E)=>{return [["",[D,E,A,B,C,A,B,C]],["0",D],["1",E],["2",A],["3",B],["4",C],[0,"njson"],["5",A],["6",B],["7",C]]})(new Uint8Array([110,106,115,111,110]),new Map(),new Set(["njson"]),new Set(),new Map())',
    contexts: '((A,B,C,D)=>{D.push(A,B,C,A,B,C);return [{"":D},D,D,D,D,D,C,D,D,D]})(new Uint8Array([110,106,115,111,110]),new Map(),new Set(["njson"]),[new Set(),new Map()])',
    func:     noop
  },
  reviver: {
    calls:
      '((A,B,C,D,E)=>{return [["0",D],["1",E],["2",A],["3",B],[0,"njson"],["4",C],["5",A],["6",B],["7",C],["",[D,E,A,B,C,A,B,C]]]})(new Uint8Array([110,106,115,111,110]),new Map(),new Set(["njson"]),new Set(),new Map())',
    contexts: '((A,B,C,D)=>{D.push(A,B,C,A,B,C);return [D,D,D,D,C,D,D,D,D,{"":D}]})(new Uint8Array([110,106,115,111,110]),new Map(),new Set(["njson"]),[new Set(),new Map()])',
    func:     noop
  },
  stringified: '((A,B,C)=>{return [new Set(),new Map(),A,B,C,A,B,C]})(new Uint8Array([110,106,115,111,110]),new Map(),new Set(["njson"]))',
  value:       array6
};

// errors

const originalMessage = "original error";
const originalError = new RangeError(originalMessage);
const thrownMessage = "thrown error";
const thrownError = new EvalError(thrownMessage);
const array7 = [describe, describe, originalError, thrownError, thrownError];

Object.defineProperties(originalError, { stack: { configurable: true, value: `${originalError.stack?.split("\n")[0]}\n    original stack`, writable: true } });
Object.defineProperties(thrownError, {
  cause: { configurable: true, value: originalError, writable: true },
  name:  { configurable: true, value: "TestError", writable: true },
  stack: { configurable: true, value: `${thrownError.stack?.split("\n")[0]}\n    thrown stack`, writable: true }
});

const errors = {
  evaluated:
    '((A,B)=>{return [null,null,A,Object.assign(B,{"cause":A,"name":"TestError","stack":"EvalError: thrown error\\n    thrown stack"}),B]})(Object.assign(new RangeError("original error"),{"stack":"RangeError: original error\\n    original stack"}),new EvalError("thrown error"))',
  replacer: {
    calls:
      '((A,B,C,D,E,F)=>{return [["",[null,null,Object.assign(A,{"message":C,"stack":D}),Object.assign(B,{"cause":A,"message":E,"name":"TestError","stack":F}),B]],["0",null],["1",null],["2",A],["message",C],["stack",D],["3",B],["cause",A],["message",E],["name","TestError"],["stack",F],["4",B]]})(new RangeError(""),new EvalError(""),"original error","RangeError: original error\\n    original stack","thrown error","EvalError: thrown error\\n    thrown stack")',
    contexts:
      '((A,B,C)=>{C.push(A,Object.assign(B,{"cause":A,"name":"TestError","stack":"EvalError: thrown error\\n    thrown stack"}),B);return [{"":C},C,C,C,A,A,C,B,B,B,B,C]})(Object.assign(new RangeError("original error"),{"stack":"RangeError: original error\\n    original stack"}),new EvalError("thrown error"),[null,null])',
    func: noop
  },
  reviver: {
    calls:
      '((A,B,C,D)=>{return [["0",null],["1",null],["message",A],["2",Object.assign(B,{"message":A,"stack":"RangeError: original error\\n    original stack"})],["message",C],["3",Object.assign(D,{"cause":B,"message":C,"name":"TestError","stack":"EvalError: thrown error\\n    thrown stack"})],["4",D],["",[null,null,B,D,D]]]})("original error",new RangeError(""),"thrown error",new EvalError(""))',
    contexts:
      '((A,B,C)=>{C.push(A,Object.assign(B,{"cause":A,"name":"TestError","stack":"EvalError: thrown error\\n    thrown stack"}),B);return [C,C,A,C,B,C,C,{"":C}]})(Object.assign(new RangeError("original error"),{"stack":"RangeError: original error\\n    original stack"}),new EvalError("thrown error"),[null,null])',
    func: noop
  },
  stringified:
    '((A,B)=>{return [null,null,A,Object.assign(B,{"cause":A,"name":"TestError","stack":"EvalError: thrown error\\n    thrown stack"}),B]})(Object.assign(new RangeError("original error"),{"stack":"RangeError: original error\\n    original stack"}),new EvalError("thrown error"))',
  value: array7
};

// repeated references created

const object6 = { test: "njson" };
const object7 = { njson: "test" };
const array8 = [23, 42];
const array9 = [1, 2, 3];
const array10 = [object6, 1, 2, object7, array8, 5, 6, array9];
const replacer1 = function(this: unknown, key: number | string, value: unknown): unknown {
  if(this instanceof Array && this.length === 8) {
    if(key === "0") return 0;
    if(key === "1") return object6;
    if(key === "2") return object7;
    if(key === "3") return 3;
    if(key === "5") return array8;
    if(key === "6") return array9;
  }
  return value;
};
const reviver1 = function(this: unknown, key: number | string, value: unknown): unknown {
  if(this instanceof Array && this.length === 8) {
    if(key === "0") return this[1];
    if(key === "3") return this[2];
  }
  return value;
};

const repeated_references_created = {
  evaluated: '((A,B)=>{return [0,{"test":"njson"},{"njson":"test"},3,A,A,B,B]})([23,42],[1,2,3])',
  replacer:  {
    calls:
      '((A,B,C,D)=>{return [["",[A,1,2,B,C,5,6,D]],["0",A],["1",1],["test","njson"],["2",2],["njson","test"],["3",B],["4",C],["0",23],["1",42],["5",5],["6",6],["0",1],["1",2],["2",3],["7",D]]})({"test":"njson"},{"njson":"test"},[23,42],[1,2,3])',
    contexts: '((A,B,C,D,E)=>{A.push(B,1,2,C,D,5,6,E);return [{"":A},A,A,B,A,C,A,A,D,D,A,A,E,E,E,A]})([],{"test":"njson"},{"njson":"test"},[23,42],[1,2,3])',
    func:     replacer1
  },
  reviver: {
    calls:
      '((A,B,C,D)=>{return [["0",0],["test","njson"],["1",C],["njson","test"],["2",D],["3",3],["0",23],["1",42],["4",A],["5",A],["0",1],["1",2],["2",3],["6",B],["7",B],["",[C,C,D,D,A,A,B,B]]]})([23,42],[1,2,3],{"test":"njson"},{"njson":"test"})',
    contexts: '((A,B,C,D,E)=>{E.push(A,A,B,B,C,C,D,D);return [E,A,E,B,E,E,C,C,E,E,D,D,D,E,E,{"":E}]})({"test":"njson"},{"njson":"test"},[23,42],[1,2,3],[])',
    func:     reviver1
  },
  stringified: '((A,B,C,D)=>{return [A,A,B,B,C,C,D,D]})({"test":"njson"},{"njson":"test"},[23,42],[1,2,3])',
  value:       array10
};

// repeated references removed

const array11 = [object6, object6, object7, object7, array8, array8, array9, array9];
const replacer2 = function(this: unknown, key: number | string, value: unknown): unknown {
  if(this instanceof Array && this.length === 8) {
    if(key === "0") return 0;
    if(key === "3") return 3;
  }
  return value;
};
const reviver2 = function(this: unknown, key: number | string, value: unknown): unknown {
  if(this instanceof Array && this.length === 8) {
    if(key === "4") return 4;
    if(key === "7") return 7;
  }
  return value;
};

const repeated_references_removed = {
  evaluated: '((A,B)=>{return [0,{"test":"njson"},{"njson":"test"},3,A,A,B,B]})([23,42],[1,2,3])',
  replacer:  {
    calls:
      '((A,B,C,D)=>{return [["",[A,A,B,B,C,C,D,D]],["0",A],["1",A],["test","njson"],["2",B],["njson","test"],["3",B],["4",C],["0",23],["1",42],["5",C],["6",D],["0",1],["1",2],["2",3],["7",D]]})({"test":"njson"},{"njson":"test"},[23,42],[1,2,3])',
    contexts: '((A,B,C,D,E)=>{E.push(A,A,B,B,C,C,D,D);return [{"":E},E,E,A,E,B,E,E,C,C,E,E,D,D,D,E]})({"test":"njson"},{"njson":"test"},[23,42],[1,2,3],[])',
    func:     replacer2
  },
  reviver: {
    calls:
      '((A,B,C,D)=>{return [["0",0],["test","njson"],["1",C],["njson","test"],["2",D],["3",3],["0",23],["1",42],["4",A],["5",A],["0",1],["1",2],["2",3],["6",B],["7",B],["",[0,C,D,3,4,A,B,7]]]})([23,42],[1,2,3],{"test":"njson"},{"njson":"test"})',
    contexts: '((A,B,C,D,E)=>{B.push(A,C,3,4,D,E,7);return [B,A,B,C,B,B,D,D,B,B,E,E,E,B,B,{"":B}]})({"test":"njson"},[0],{"njson":"test"},[23,42],[1,2,3])',
    func:     reviver2
  },
  stringified: '[0,{"test":"njson"},{"njson":"test"},3,4,[23,42],[1,2,3],7]',
  value:       array11
};

const tests: Record<string, RefTest> = {
  circular_arrays,
  circular_maps,
  circular_mixed_1,
  circular_mixed_2,
  circular_objects,
  circular_sets,
  errors,
  long_strings,
  repeated_references,
  repeated_references_created,
  repeated_references_removed
};

function check(name: string, value: unknown, stringified: string) {
  describe(name, () => {
    it("to be", () => expect(NJSON.stringify(value, { stringLength: 10 })).toBe(stringified));
    it("evaluated", () => expect(NJSON.stringify(eval(`(${stringified})`), { stringLength: 10 })).toBe(stringified));
  });
}

describe("references", () => {
  for(const [name, test] of Object.entries(tests)) {
    describe(name.replace(/_/g, " "), () => {
      const expected = readFileSync(`./test/references/${name}.njson`).toString().replace(/\n$/, "");
      const replacer = jest.fn(test.replacer.func);
      const reviver = jest.fn(test.reviver.func);
      const stringified = NJSON.stringify(test.value, { replacer, space: 2, stringLength: 10 });

      it("stringified", () => expect(stringified).toBe(expected));
      check("replacer.calls", replacer.mock.calls, test.replacer.calls);
      check("replacer.contexts", replacer.mock.contexts, test.replacer.contexts);

      if(test.replacer.func === noop) it("re-stringified", () => expect(NJSON.stringify(eval(`(${stringified})`), { replacer, space: 2, stringLength: 10 })).toBe(expected));

      try {
        check("evaluated", eval(`(${stringified})`), test.evaluated);
        check("parsed", NJSON.parse(stringified, { reviver }), test.stringified);
        check("reviver.calls", reviver.mock.calls, test.reviver.calls);
        check("reviver.contexts", reviver.mock.contexts, test.reviver.contexts);
      } catch(e) {
        // eslint-disable-next-line no-console
        console.log("Can't parse", stringified, e);
      }
    });
  }

  it("identifiers", () => {
    const b: unknown[] = [];
    const array: unknown[] = [b];

    for(let i = 0; i < 30; ++i) {
      const a: unknown[] = [];

      array.push(a, a);
    }
    array.push(b);

    expect(NJSON.stringify(array)).toBe(
      "((A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z,AA,AB,AC,AD,AE)=>{return [AE,A,A,B,B,C,C,D,D,E,E,F,F,G,G,H,H,I,I,J,J,K,K,L,L,M,M,N,N,O,O,P,P,Q,Q,R,R,S,S,T,T,U,U,V,V,W,W,X,X,Y,Y,Z,Z,AA,AA,AB,AB,AC,AC,AD,AD,AE]})([],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[])"
    );
  });
});
