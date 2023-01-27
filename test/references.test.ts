import { readFileSync } from "fs";

import { NJSON, NjsonFunction } from "../index";

interface Func {
  calls: string;
  contextes: string;
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
  evaluated: '((A)=>{A["object2"]={"object1":A,"test":"njson"};return A})({"njson":"test"})',
  replacer:  {
    calls:     '((A,B)=>{A["object2"]=B;B["object1"]=A;return [["",A],["njson","test"],["object2",B],["object1",A],["test","njson"]]})({"njson":"test"},{"test":"njson"})',
    contextes: '((A,B)=>{A["object2"]=B;B["object1"]=A;return [{"":A},A,A,B,B]})({"njson":"test"},{"test":"njson"})',
    func:      noop
  },
  reviver: {
    calls:     '((A,B)=>{A["object2"]=B;B["object1"]=A;return [["njson","test"],["object1",A],["test","njson"],["object2",B],["",A]]})({"njson":"test"},{"test":"njson"})',
    contextes: '((A,B)=>{A["object2"]=B;B["object1"]=A;return [A,B,B,A,{"":A}]})({"njson":"test"},{"test":"njson"})',
    func:      noop
  },
  stringified: '((A)=>{A["object2"]={"object1":A,"test":"njson"};return A})({"njson":"test"})',
  value:       object1
};

// circular arrays
const array1 = [23, 0 as unknown, 42];
const array2 = [1, 2, array1, 3];
const object3 = { array1, array2 };
array1[1] = array2;

const circular_arrays = {
  evaluated: '((A,B)=>{A[1]=B;B[2]=A;return {"array1":A,"array2":B}})([23,0,42],[1,2,0,3])',
  replacer:  {
    calls:     '((A,B)=>{A[1]=B;B[2]=A;return [["",{"array1":A,"array2":B}],["array1",A],["0",23],["1",B],["0",1],["1",2],["2",A],["3",3],["2",42],["array2",B]]})([23,0,42],[1,2,0,3])',
    contextes: '((A,B,C)=>{A[1]=B;B[2]=A;C["array1"]=A;C["array2"]=B;return [{"":C},C,A,A,B,B,B,B,A,C]})([23,0,42],[1,2,0,3],{})',
    func:      noop
  },
  reviver: {
    calls:     '((A,B)=>{A[1]=B;B[2]=A;return [["0",23],["0",1],["1",2],["2",A],["3",3],["1",B],["2",42],["array1",A],["array2",B],["",{"array1":A,"array2":B}]]})([23,0,42],[1,2,0,3])',
    contextes: '((A,B,C)=>{A[1]=B;B[2]=A;C["array1"]=A;C["array2"]=B;return [A,B,B,B,B,A,A,C,C,{"":C}]})([23,0,42],[1,2,0,3],{})',
    func:      noop
  },
  stringified: '((A,B)=>{A[1]=B;B[2]=A;return {"array1":A,"array2":B}})([23,0,42],[1,2,0,3])',
  value:       object3
};

// circular sets
const set1 = new Set<unknown>(["njson"]);
const set2 = new Set([23, 42, set1, { test: "njson" }]);
set1.add(set2);
set1.add(new Int8Array([23, 42]));

const circular_sets = {
  evaluated: '((A)=>{A.add(new Set([23,42,A,{"test":"njson"}]));A.add(new Int8Array([23,42]));return A})(new Set(["njson"]))',
  replacer:  {
    calls:
      '((A,B,C,D)=>{A.add(B);A.add(D);B.add(A);B.add(C);return [["",A],[0,"njson"],[1,B],[0,23],[1,42],[2,A],[3,C],["test","njson"],[2,D]]})(new Set(["njson"]),new Set([23,42]),{"test":"njson"},new Int8Array([23,42]))',
    contextes: '((A,B,C)=>{A.add(B);A.add(new Int8Array([23,42]));B.add(A);B.add(C);return [{"":A},A,A,B,B,B,B,C,A]})(new Set(["njson"]),new Set([23,42]),{"test":"njson"})',
    func:      noop
  },
  reviver: {
    calls:
      '((A,B,C,D)=>{A.add(C);A.add(D);C.add(A);C.add(B);return [[0,"njson"],[0,23],[1,42],[2,A],["test","njson"],[3,B],[1,C],[2,D],["",A]]})(new Set(["njson"]),{"test":"njson"},new Set([23,42]),new Int8Array([23,42]))',
    contextes: '((A,B,C)=>{A.add(B);A.add(new Int8Array([23,42]));B.add(A);B.add(C);return [A,B,B,B,C,B,A,A,{"":A}]})(new Set(["njson"]),new Set([23,42]),{"test":"njson"})',
    func:      noop
  },
  stringified: '((A)=>{A.add(new Set([23,42,A,{"test":"njson"}]));A.add(new Int8Array([23,42]));return A})(new Set(["njson"]))',
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
    '((A,B)=>{B.set(5,new Map([["test","njson"],[{},B],[A,3]]));B.set("test","njson");B.set(new Map([[[],A],[B,4],["test","njson"]]),["test","njson"]);B.set(6,A);return B})({"test":"njson"},new Map([[1,2]]))',
  replacer: {
    calls:
      '((A,B,C,D,E,F,G)=>{B.set(5,C);B.set("test","njson");B.set(E,F);B.set(6,A);C.set(D,B);C.set(A,3);E.set(G,A);E.set(B,4);E.set("test","njson");return [["",B],[0,[1,2]],[1,[5,C]],[0,["test","njson"]],[1,[D,B]],[2,[A,3]],["test","njson"],[2,["test","njson"]],[3,[E,F]],[0,[G,A]],[1,[B,4]],[2,["test","njson"]],["0","test"],["1","njson"],[4,[6,A]]]})({"test":"njson"},new Map([[1,2]]),new Map([["test","njson"]]),{},new Map(),["test","njson"],[])',
    contextes:
      '((A,B,C,D,E)=>{B.set(5,C);B.set("test","njson");B.set(D,E);B.set(6,A);C.set({},B);C.set(A,3);D.set([],A);D.set(B,4);D.set("test","njson");return [{"":B},B,B,C,C,C,A,B,B,D,D,D,E,E,B]})({"test":"njson"},new Map([[1,2]]),new Map([["test","njson"]]),new Map(),["test","njson"])',
    func: noop
  },
  reviver: {
    calls:
      '((A,B,C,D,E,F,G)=>{C.set(5,D);C.set("test","njson");C.set(F,G);C.set(6,B);D.set(A,C);D.set(B,3);F.set(E,B);F.set(C,4);F.set("test","njson");return [[0,[1,2]],[0,["test","njson"]],[1,[A,C]],["test","njson"],[2,[B,3]],[1,[5,D]],[2,["test","njson"]],[0,[E,B]],[1,[C,4]],[2,["test","njson"]],["0","test"],["1","njson"],[3,[F,G]],[4,[6,B]],["",C]]})({},{"test":"njson"},new Map([[1,2]]),new Map([["test","njson"]]),[],new Map(),["test","njson"])',
    contextes:
      '((A,B,C,D,E)=>{B.set(5,C);B.set("test","njson");B.set(D,E);B.set(6,A);C.set({},B);C.set(A,3);D.set([],A);D.set(B,4);D.set("test","njson");return [B,C,C,A,C,B,B,D,D,D,E,E,B,B,{"":B}]})({"test":"njson"},new Map([[1,2]]),new Map([["test","njson"]]),new Map(),["test","njson"])',
    func: noop
  },
  stringified:
    '((A,B)=>{B.set(5,new Map([["test","njson"],[{},B],[A,3]]));B.set("test","njson");B.set(new Map([[[],A],[B,4],["test","njson"]]),["test","njson"]);B.set(6,A);return B})({"test":"njson"},new Map([[1,2]]))',
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
    '((A,B,C,D)=>{A["array4"]=B;A["map4"]=C;A["object5"]=A;A["set3"]=D;B[1]=A;B[2]=C;B[3]=D;B[4]=B;C.set("B",A);C.set(B,D);D.add(A);D.add(B);D.add(C);return A})({"njson":"test"},[1],new Map([["A","njson"]]),new Set(["a"]))',
  replacer: {
    calls:
      '((A,B,C,D)=>{A["array4"]=B;A["map4"]=C;A["object5"]=A;A["set3"]=D;B[1]=A;B[2]=C;B[3]=D;B[4]=B;C.set("B",A);C.set(B,D);D.add(A);D.add(B);D.add(C);return [["",A],["njson","test"],["array4",B],["0",1],["1",A],["2",C],[0,["A","njson"]],[1,["B",A]],[2,[B,D]],[0,"a"],[1,A],[2,B],[3,C],["3",D],["4",B],["map4",C],["object5",A],["set3",D]]})({"njson":"test"},[1],new Map([["A","njson"]]),new Set(["a"]))',
    contextes:
      '((A,B,C,D)=>{A["array4"]=B;A["map4"]=C;A["object5"]=A;A["set3"]=D;B[1]=A;B[2]=C;B[3]=D;B[4]=B;C.set("B",A);C.set(B,D);D.add(A);D.add(B);D.add(C);return [{"":A},A,A,B,B,B,C,C,C,D,D,D,D,B,B,A,A,A]})({"njson":"test"},[1],new Map([["A","njson"]]),new Set(["a"]))',
    func: noop
  },
  reviver: {
    calls:
      '((A,B,C,D)=>{A["array4"]=B;A["map4"]=C;A["object5"]=A;A["set3"]=D;B[1]=A;B[2]=C;B[3]=D;B[4]=B;C.set("B",A);C.set(B,D);D.add(A);D.add(B);D.add(C);return [["njson","test"],["0",1],["1",A],[0,["A","njson"]],[1,["B",A]],[0,"a"],[1,A],[2,B],[3,C],[2,[B,D]],["2",C],["3",D],["4",B],["array4",B],["map4",C],["object5",A],["set3",D],["",A]]})({"njson":"test"},[1],new Map([["A","njson"]]),new Set(["a"]))',
    contextes:
      '((A,B,C,D)=>{A["array4"]=B;A["map4"]=C;A["object5"]=A;A["set3"]=D;B[1]=A;B[2]=C;B[3]=D;B[4]=B;C.set("B",A);C.set(B,D);D.add(A);D.add(B);D.add(C);return [A,B,B,C,C,D,D,D,D,C,B,B,B,A,A,A,A,{"":A}]})({"njson":"test"},[1],new Map([["A","njson"]]),new Set(["a"]))',
    func: noop
  },
  stringified:
    '((A,B,C,D)=>{A["array4"]=B;A["map4"]=C;A["object5"]=A;A["set3"]=D;B[1]=A;B[2]=C;B[3]=D;B[4]=B;C.set("B",A);C.set(B,D);D.add(A);D.add(B);D.add(C);return A})({"njson":"test"},[1],new Map([["A","njson"]]),new Set(["a"]))',
  value: object5
};

const circular_mixed_2 = {
  evaluated:
    '((A,B,C,D)=>{A["array4"]=C;A["map4"]=B;A["object5"]=A;A["set3"]=D;B.set("B",A);B.set(C,D);C[1]=A;C[2]=B;C[3]=D;C[4]=C;D.add(A);D.add(C);D.add(B);return B})({"njson":"test"},new Map([["A","njson"]]),[1],new Set(["a"]))',
  replacer: {
    calls:
      '((A,B,C,D)=>{A["array4"]=C;A["map4"]=B;A["object5"]=A;A["set3"]=D;B.set("B",A);B.set(C,D);C[1]=A;C[2]=B;C[3]=D;C[4]=C;D.add(A);D.add(C);D.add(B);return [["",B],[0,["A","njson"]],[1,["B",A]],["njson","test"],["array4",C],["0",1],["1",A],["2",B],["3",D],[0,"a"],[1,A],[2,C],[3,B],["4",C],["map4",B],["object5",A],["set3",D],[2,[C,D]]]})({"njson":"test"},new Map([["A","njson"]]),[1],new Set(["a"]))',
    contextes:
      '((A,B,C,D)=>{A["array4"]=C;A["map4"]=B;A["object5"]=A;A["set3"]=D;B.set("B",A);B.set(C,D);C[1]=A;C[2]=B;C[3]=D;C[4]=C;D.add(A);D.add(C);D.add(B);return [{"":B},B,B,A,A,C,C,C,C,D,D,D,D,C,A,A,A,B]})({"njson":"test"},new Map([["A","njson"]]),[1],new Set(["a"]))',
    func: noop
  },
  reviver: {
    calls:
      '((A,B,C,D)=>{A["array4"]=B;A["map4"]=C;A["object5"]=A;A["set3"]=D;B[1]=A;B[2]=C;B[3]=D;B[4]=B;C.set("B",A);C.set(B,D);D.add(A);D.add(B);D.add(C);return [[0,["A","njson"]],["njson","test"],["0",1],["1",A],["2",C],[0,"a"],[1,A],[2,B],[3,C],["3",D],["4",B],["array4",B],["map4",C],["object5",A],["set3",D],[1,["B",A]],[2,[B,D]],["",C]]})({"njson":"test"},[1],new Map([["A","njson"]]),new Set(["a"]))',
    contextes:
      '((A,B,C,D)=>{A["array4"]=C;A["map4"]=B;A["object5"]=A;A["set3"]=D;B.set("B",A);B.set(C,D);C[1]=A;C[2]=B;C[3]=D;C[4]=C;D.add(A);D.add(C);D.add(B);return [B,A,C,C,C,D,D,D,D,C,C,A,A,A,A,B,B,{"":B}]})({"njson":"test"},new Map([["A","njson"]]),[1],new Set(["a"]))',
    func: noop
  },
  stringified:
    '((A,B,C,D)=>{A["array4"]=C;A["map4"]=B;A["object5"]=A;A["set3"]=D;B.set("B",A);B.set(C,D);C[1]=A;C[2]=B;C[3]=D;C[4]=C;D.add(A);D.add(C);D.add(B);return B})({"njson":"test"},new Map([["A","njson"]]),[1],new Set(["a"]))',
  value: map4
};

// long strings
const str = "long string";
const array5 = [[str], str];
(array5[0] as unknown[]).push(array5);

const long_strings = {
  evaluated: '((A,B)=>{B[0]=[A,B];B[1]=A;return B})("long string",[])',
  replacer:  {
    calls:     '((A,B,C)=>{B[0]=C;B[1]=A;C[0]=A;C[1]=B;return [["",B],["0",C],["0",A],["1",B],["1",A]]})("long string",[],[])',
    contextes: '((A,B,C)=>{B[0]=C;B[1]=A;C[0]=A;C[1]=B;return [{"":B},B,C,C,B]})("long string",[],[])',
    func:      noop
  },
  reviver: {
    calls:     '((A,B,C)=>{B[0]=C;B[1]=A;C[0]=A;C[1]=B;return [["0",A],["1",B],["0",C],["1",A],["",B]]})("long string",[],[])',
    contextes: '((A,B,C)=>{B[0]=A;B[1]=C;C[0]=B;C[1]=A;return [B,B,C,C,{"":C}]})("long string",[],[])',
    func:      noop
  },
  stringified: '((A,B)=>{B[0]=[A,B];B[1]=A;return B})("long string",[])',
  value:       array5
};

// repeated references
const buffer = Buffer.from("njson");
const map6 = new Map();
const set4 = new Set(["njson"]);
const array6 = [buffer, map6, set4, buffer, map6, set4];

const repeated_references = {
  evaluated: '((A,B,C)=>{return [A,B,C,A,B,C]})(new Uint8Array([110,106,115,111,110]),new Map(),new Set(["njson"]))',
  replacer:  {
    calls:     '((A,B,C)=>{return [["",[A,B,C,A,B,C]],["0",A],["1",B],["2",C],[0,"njson"],["3",A],["4",B],["5",C]]})(new Uint8Array([110,106,115,111,110]),new Map(),new Set(["njson"]))',
    contextes: '((A,B,C,D)=>{D[0]=A;D[1]=B;D[2]=C;D[3]=A;D[4]=B;D[5]=C;return [{"":D},D,D,D,C,D,D,D]})(new Uint8Array([110,106,115,111,110]),new Map(),new Set(["njson"]),[])',
    func:      noop
  },
  reviver: {
    calls:     '((A,B,C)=>{return [["0",A],["1",B],[0,"njson"],["2",C],["3",A],["4",B],["5",C],["",[A,B,C,A,B,C]]]})(new Uint8Array([110,106,115,111,110]),new Map(),new Set(["njson"]))',
    contextes: '((A,B,C,D)=>{D[0]=A;D[1]=B;D[2]=C;D[3]=A;D[4]=B;D[5]=C;return [D,D,C,D,D,D,D,{"":D}]})(new Uint8Array([110,106,115,111,110]),new Map(),new Set(["njson"]),[])',
    func:      noop
  },
  stringified: '((A,B,C)=>{return [A,B,C,A,B,C]})(new Uint8Array([110,106,115,111,110]),new Map(),new Set(["njson"]))',
  value:       array6
};

// errors

const originalMessage = "original error";
const originalError = new RangeError(originalMessage);
const thrownMessage = "thrown error";
const thrownError = new EvalError(thrownMessage);
//Object.defineProperty(thrownError, "cause", { configurable: true, value: originalError, writable: true });
const array7 = [describe, describe, originalError, thrownError, thrownError];

const errors = {
  evaluated: '((A)=>{return [null,null,new RangeError("original error"),A,A]})(new EvalError("thrown error"))',
  replacer:  {
    calls:
      '((A,B,C,D)=>{return [["",[null,null,B,A,A]],["0",null],["1",null],["2",B],["message",C],["3",A],["message",D],["4",A]]})(new EvalError("thrown error"),new RangeError("original error"),"original error","thrown error")',
    contextes: '((A,B,C)=>{B[2]=C;B[3]=A;B[4]=A;return [{"":B},B,B,B,C,B,A,B]})(new EvalError("thrown error"),[null,null],new RangeError("original error"))',
    func:      noop
  },
  reviver: {
    calls:
      '((A,B,C,D)=>{return [["0",null],["1",null],["message",A],["2",D],["message",B],["3",C],["4",C],["",[null,null,D,C,C]]]})("original error","thrown error",new EvalError("thrown error"),new RangeError("original error"))',
    contextes: '((A,B,C)=>{B[2]=C;B[3]=A;B[4]=A;return [B,B,C,B,A,B,B,{"":B}]})(new EvalError("thrown error"),[null,null],new RangeError("original error"))',
    func:      noop
  },
  stringified: '((A)=>{return [null,null,new RangeError("original error"),A,A]})(new EvalError("thrown error"))',
  value:       array7
};

const tests: Record<string, RefTest> = { circular_arrays, circular_maps, circular_mixed_1, circular_mixed_2, circular_objects, circular_sets, errors, long_strings, repeated_references };

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
      check("replacer.contexts", replacer.mock.contexts, test.replacer.contextes);

      if(test.replacer.func === noop) it("restringified", () => expect(NJSON.stringify(eval(`(${stringified})`), { replacer, space: 2, stringLength: 10 })).toBe(expected));

      try {
        check("evaluated", eval(`(${stringified})`), test.evaluated);
        check("parsed", NJSON.parse(stringified, { reviver }), test.stringified);
        check("reviver.calls", reviver.mock.calls, test.reviver.calls);
        check("reviver.contexts", reviver.mock.contexts, test.reviver.contextes);
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
