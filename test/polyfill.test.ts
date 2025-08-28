/* eslint-disable @typescript-eslint/no-invalid-void-type */
import express from "express";
import { Server } from "http";

import { expressNJSON, fetchNJSON, NJSON, NjsonParseOptions } from "../index";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const njsonPayload: any[] = ["test"];
njsonPayload.push(njsonPayload);

const options: NjsonParseOptions = {
  numberKey: true,
  reviver:   (key, value) => (key === 0 ? "njson" : value)
};

fetchNJSON(options);

const match = /v(\d+)/.exec(process.version);
const ge20 = match && parseInt(match[1], 10) >= 20;

describe("polyfill", () => {
  describe("Request.njson", () => {
    const app = express();
    let server: Server;

    const jsonPayload = { test: 23 };

    beforeAll(done => {
      app.use(expressNJSON());

      app.all("/json", (_, res) => res.json(jsonPayload) as unknown as void);
      app.all("/njson", (_, res) => res.njson(njsonPayload) as unknown as void);
      app.all("/text", (_, res) => res.set({ "Content-Type": "text/plain" }).end("text") as unknown as void);

      server = app.listen(2323, done);
    });

    afterAll(done => {
      server.close(done);
    });

    it("as Request.json try to parse regardless from content-type", async () => {
      const res = async () => await fetch("http://localhost:2323/text");

      await expect((await res()).json()).rejects.toThrow(ge20 ? "Unexpected token 'e', \"text\" is not valid JSON" : "Unexpected token e in JSON at position 1");
      await expect((await res()).njson()).rejects.toThrow('but "t" found at 1:1');
    });

    it("throws an error with the correct stack trace", async () => {
      expect.assertions(1);

      const res = await fetch("http://localhost:2323/text");

      try {
        await res.njson();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch(error: any) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(error.stack).not.toMatch("next-json/index");
      }
    });

    it("can parse a JSON as Request.json", async () => {
      const res = async () => await fetch("http://localhost:2323/json");

      await expect((await res()).json()).resolves.toEqual(jsonPayload);
      await expect((await res()).njson()).resolves.toEqual(jsonPayload);
    });

    it("parses the body using the default options", async () => {
      const res = await fetch("http://localhost:2323/njson");
      const body = await res.njson();

      expect(NJSON.stringify(body)).toBe('((A)=>Object.assign(A,{"1":A}))(["njson"])');
    });

    it("parses the body overriding the default options", async () => {
      const res = await fetch("http://localhost:2323/njson");
      const body = await res.njson({});

      expect(NJSON.stringify(body)).toBe('((A)=>Object.assign(A,{"1":A}))(["test"])');
    });
  });

  describe("NJSON body parser", () => {
    const app = express();
    let server: Server;

    beforeAll(done => {
      app.use((req, _, next) => {
        if(req.headers["content-type"] === "test") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
          (req as any)._body = true;
          req.body = "test";
        }
        next();
      });

      app.use(expressNJSON({ parse: options }));

      app.all("/mirror", (req, res) => res.njson(req.body) as unknown as void);

      server = app.listen(2324, done);
    });

    afterAll(done => {
      server.close(done);
    });

    it("doesn't parse an already parsed body", async () => {
      const res = await fetch("http://localhost:2324/mirror", {
        body:    NJSON.stringify(njsonPayload),
        headers: { "Content-Type": "test" },
        method:  "POST"
      });
      const body = await res.njson({});

      expect(NJSON.stringify(body)).toBe('"test"');
    });

    it("doesn't parse the body unless the request has the right content type", async () => {
      const res = await fetch("http://localhost:2324/mirror", {
        body:    NJSON.stringify(njsonPayload),
        headers: { "Content-Type": "application/json" },
        method:  "POST"
      });
      const body = await res.njson({});

      expect(NJSON.stringify(body)).toBe("undefined");
    });

    it("parses the body using the options", async () => {
      const res = await fetch("http://localhost:2324/mirror", {
        body:    NJSON.stringify(njsonPayload),
        headers: { "Content-Type": "application/njson" },
        method:  "POST"
      });
      const body = await res.njson({});

      expect(NJSON.stringify(body)).toBe('((A)=>Object.assign(A,{"1":A}))(["njson"])');
    });

    it("gives error with wrong NJSON encoded string", async () => {
      const res = await fetch("http://localhost:2324/mirror", {
        body:    "njson",
        headers: { "Content-Type": "application/njson" },
        method:  "POST"
      });
      const body = await res.text();

      expect(res.status).toBe(500);
      expect(res.statusText).toBe("Internal Server Error");
      expect(body).toMatch("found at 1:1");
    });
  });

  describe("Express.Response.njson()", () => {
    const app = express();
    const payload = { date: new Date("1976-01-23 15:00:00 GMT+0100") };
    let server: Server;

    beforeAll(done => {
      app.use(expressNJSON({ stringify: { date: "utc" } }));

      app.all("/default", (_, res) => res.njson(payload) as unknown as void);
      app.all("/override", (_, res) => res.njson(payload, {}) as unknown as void);

      server = app.listen(2325, done);
    });

    afterAll(done => {
      server.close(done);
    });

    it("serializes the body using the default options", async () => {
      const res = await fetch("http://localhost:2325/default");

      await expect(res.text()).resolves.toBe('{"date":new Date("Fri, 23 Jan 1976 14:00:00 GMT")}');
    });

    it("serializes the body overriding the default options", async () => {
      const res = await fetch("http://localhost:2325/override");

      await expect(res.text()).resolves.toBe('{"date":new Date(191253600000)}');
    });
  });
});
