import { diffChars, diffArrays, diffJson } from "diff";

const SUCCESS = "success";
const FAILURE = "failure";
const ERROR = "error";

class Test {
  static SUCCESS = SUCCESS;

  static FAILURE = FAILURE;

  static ERROR = ERROR;

  postprocess(thing) {
    return thing;
  }

  interaction() {
    throw Error("Define the `interaction` method in your subclass of `Test`.");
  }

  matches(expected, actual) {
    if (typeof expected === "object" && typeof actual === "object") {
      return Object.keys(actual).every((key) => {
        return expected[key] === actual[key];
      });
    } else {
      return expected === actual;
    }
  }

  constructor(params) {
    this.params = params || {};
  }

  diff(expected, actual) {
    if (typeof expected === "string" && typeof actual === "string") {
      return diffChars(expected, actual);
    }
    if (typeof expected === "object" && typeof actual === "object") {
      if (expected.length !== undefined && actual.length !== undefined) {
        return diffArrays(expected, actual);
      }
      if (expected.length === undefined && actual.length === undefined) {
        return diffJson(expected, actual);
      }
    }
    return null;
  }

  supports() {
    return true;
  }

  name() {
    return this.params.name;
  }

  description() {
    return this.params.description;
  }

  expected() {
    return this.params.expected;
  }

  async actual(data) {
    return this.postprocess(
      data ? this.interaction().parse(data) : this.interaction().run()
    );
  }

  async run() {
    try {
      const actual = await this.actual();
      return this.resolve(actual);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      return { status: ERROR, message: e.message };
    }
  }

  async runParse(data) {
    try {
      const actual = await this.actual(data);
      // Both Coldcard responses include Objects
      // but the xpub object includes a rootFingerprint
      // while signatures only includes pubkeys and signatures
      const sendToResolver = actual.rootFingerprint
        ? {
            xpub: actual.xpub || actual.tpub,
            rootFingerprint: actual.rootFingerprint,
          }
        : Object.values(actual)[0];
      return this.resolve(sendToResolver);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      return { status: ERROR, message: e.message };
    }
  }

  resolve(actual) {
    const expected = this.expected();
    if (this.matches(expected, actual)) {
      return { status: SUCCESS };
    }
    return {
      status: FAILURE,
      expected,
      actual,
      diff: this.diff(expected, actual),
    };
  }
}

export default Test;
