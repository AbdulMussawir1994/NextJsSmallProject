import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

// Transpile the real module graph in memory, with fresh exports for each test.
// A shared module cache keeps ApiError identity consistent within each graph.
const compiledModules = new Map();

function loadModule(url, modules) {
  if (modules.has(url.href)) return modules.get(url.href).exports;

  if (!compiledModules.has(url.href)) {
    const source = readFileSync(url, "utf8");
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    });
    compiledModules.set(url.href, outputText);
  }

  const loadedModule = { exports: {} };
  modules.set(url.href, loadedModule);
  const requireLocal = (specifier) => {
    if (!specifier.startsWith(".")) {
      throw new Error(`Unexpected runtime dependency in API tests: ${specifier}`);
    }
    return loadModule(new URL(`${specifier}.ts`, url), modules);
  };
  const execute = new Function("require", "module", "exports", compiledModules.get(url.href));
  execute(requireLocal, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}

async function loadService(baseUrl, moduleName = "api-service") {
  const previous = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (baseUrl === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
  else process.env.NEXT_PUBLIC_API_BASE_URL = baseUrl;

  try {
    return loadModule(new URL(`../externals/${moduleName}.ts`, import.meta.url), new Map());
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = previous;
  }
}

const employee = {
  id: 2,
  name: "Abdul Mussawir",
  department: "IT",
  salary: 20000,
};
const input = {
  name: employee.name,
  department: employee.department,
  salary: employee.salary,
};

function success(data, overrides = {}) {
  return {
    data,
    isSuccess: true,
    message: "Employee operation completed.",
    status: 200,
    ...overrides,
  };
}

function mockResponse(t, payload, status = 200) {
  return t.mock.method(globalThis, "fetch", async () =>
    Response.json(payload, { status }),
  );
}

function assertRequest(fetchMock, path, method, body) {
  assert.equal(fetchMock.mock.callCount(), 1);
  const [url, options] = fetchMock.mock.calls[0].arguments;
  assert.equal(url, `https://localhost:7047${path}`);
  assert.equal(options.method, method);
  assert.equal(options.cache, "no-store");
  assert.equal(options.headers.Accept, "application/json");

  if (body === undefined) {
    assert.equal(options.body, undefined);
    assert.equal(options.headers["Content-Type"], undefined);
  } else {
    assert.equal(options.headers["Content-Type"], "application/json");
    assert.deepEqual(JSON.parse(options.body), body);
  }
  return options;
}

test("list reads /List and preserves the response envelope", async (t) => {
  const { employeeAPI } = await loadService();
  const payload = success([employee]);
  const fetchMock = mockResponse(t, payload);
  const controller = new AbortController();

  assert.deepEqual(await employeeAPI.list(controller.signal), payload);
  const options = assertRequest(fetchMock, "/List", "GET");
  assert.equal(options.signal, controller.signal);
});

test("the service exposes five CRUD methods and its list works as a detached callback", async (t) => {
  const { employeeAPI, EmployeeApiService } = await loadService();
  const methods = Object.getOwnPropertyNames(EmployeeApiService.prototype)
    .filter((name) => name !== "constructor")
    .sort();
  assert.deepEqual(methods, ["create", "delete", "get", "list", "update"]);
  assert.ok(employeeAPI instanceof EmployeeApiService);

  const payload = success([employee]);
  const fetchMock = mockResponse(t, payload);
  const { list } = employeeAPI;
  const controller = new AbortController();

  assert.deepEqual(await list(controller.signal), payload);
  assert.equal(fetchMock.mock.calls[0].arguments[1].signal, controller.signal);
});

test("the shared request serializes false, zero, and null JSON bodies", async (t) => {
  const { request } = await loadService(undefined, "http-client");
  const payload = success(true);
  const fetchMock = mockResponse(t, payload);

  for (const body of [false, 0, null]) {
    assert.deepEqual(await request("/example", {
      method: "PATCH",
      body,
      parseData: (data) => data,
    }), payload);
    const options = fetchMock.mock.calls.at(-1).arguments[1];
    assert.equal(options.method, "PATCH");
    assert.equal(options.headers["Content-Type"], "application/json");
    assert.equal(options.body, JSON.stringify(body));
  }
});

test("get reads /GetById/{id} and accepts an integer route parameter", async (t) => {
  const { employeeAPI } = await loadService();
  const payload = success(employee);
  const fetchMock = mockResponse(t, payload);

  assert.deepEqual(await employeeAPI.get("2"), payload);
  assertRequest(fetchMock, "/GetById/2", "GET");
});

test("create posts the model with id 0 to /Add and returns the new ID", async (t) => {
  const { employeeAPI } = await loadService();
  const payload = success(4, {
    message: "Employee add successfully",
    status: 201,
  });
  const fetchMock = mockResponse(t, payload, 201);

  assert.deepEqual(await employeeAPI.create(input), payload);
  assertRequest(fetchMock, "/Add", "POST", { ...input, id: 0 });
});

test("update puts the employee ID in the body sent to /Update", async (t) => {
  const { employeeAPI } = await loadService();
  const payload = success(employee);
  const fetchMock = mockResponse(t, payload);

  assert.deepEqual(await employeeAPI.update("2", input), payload);
  assertRequest(fetchMock, "/Update", "PUT", employee);
});

test("delete calls /Delete/{id} and requires a true result", async (t) => {
  const { employeeAPI } = await loadService();
  const payload = success(true);
  const fetchMock = mockResponse(t, payload);

  assert.deepEqual(await employeeAPI.delete(2), payload);
  assertRequest(fetchMock, "/Delete/2", "DELETE");
});

test("create, update, and delete pass optional cancellation signals to fetch", async (t) => {
  const { employeeAPI } = await loadService();
  const controller = new AbortController();
  const responses = [success(4), success(employee), success(true)];
  const fetchMock = t.mock.method(globalThis, "fetch", async () =>
    Response.json(responses.shift()),
  );

  await employeeAPI.create(input, controller.signal);
  await employeeAPI.update(2, input, controller.signal);
  await employeeAPI.delete(2, controller.signal);

  assert.equal(fetchMock.mock.callCount(), 3);
  for (const call of fetchMock.mock.calls) {
    assert.equal(call.arguments[1].signal, controller.signal);
  }
});

test("an empty list and a zero salary remain valid employee data", async (t) => {
  const { employeeAPI } = await loadService();
  const responses = [success([]), success({ ...employee, salary: 0 })];
  t.mock.method(globalThis, "fetch", async () => Response.json(responses.shift()));

  assert.deepEqual((await employeeAPI.list()).data, []);
  assert.equal((await employeeAPI.get(2)).data.salary, 0);
});

test("business failures inside HTTP 200 preserve the backend message and status", async (t) => {
  const { employeeAPI, ApiError } = await loadService();
  mockResponse(t, {
    data: null,
    isSuccess: false,
    message: " Invalid employee id. ",
    status: 204,
  });

  await assert.rejects(employeeAPI.get(1), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.message, "Invalid employee id.");
    assert.equal(error.status, 204);
    return true;
  });
});

test("failure status in a successful HTTP response is rejected", async (t) => {
  const { employeeAPI } = await loadService();
  mockResponse(t, success(employee, { status: 400, message: "Invalid salary." }));

  await assert.rejects(employeeAPI.get(2), {
    name: "ApiError",
    message: "Invalid salary.",
    status: 400,
  });
});

test("HTTP errors preserve the backend message even without a success envelope", async (t) => {
  const { employeeAPI } = await loadService();
  mockResponse(t, { message: " Employee already exists. " }, 409);

  await assert.rejects(employeeAPI.create(input), {
    name: "ApiError",
    message: "Employee already exists.",
    status: 409,
  });
});

test("non-JSON HTTP errors produce a useful error with the HTTP status", async (t) => {
  const { employeeAPI } = await loadService();
  t.mock.method(globalThis, "fetch", async () =>
    new Response("<html>Service unavailable</html>", { status: 503 }),
  );

  await assert.rejects(employeeAPI.list(), (error) => {
    assert.equal(error.name, "ApiError");
    assert.equal(error.status, 503);
    assert.match(error.message, /503/);
    return true;
  });
});

test("malformed success JSON is rejected", async (t) => {
  const { employeeAPI } = await loadService();
  t.mock.method(globalThis, "fetch", async () => new Response("{invalid JSON"));

  await assert.rejects(employeeAPI.list(), { name: "ApiError", status: 502 });
});

test("malformed response envelopes are rejected", async (t) => {
  const { employeeAPI } = await loadService();
  const invalidResponses = [
    null,
    [],
    [employee],
    { data: [employee] },
    success([employee], { isSuccess: "true" }),
    success([employee], { message: null }),
    success([employee], { status: "200" }),
    success([employee], { status: 200.5 }),
  ];
  const fetchMock = t.mock.method(globalThis, "fetch", async () =>
    Response.json(invalidResponses.shift()),
  );

  const count = invalidResponses.length;
  for (let index = 0; index < count; index++) {
    await assert.rejects(employeeAPI.list(), { name: "ApiError", status: 502 });
  }
  assert.equal(fetchMock.mock.callCount(), count);
});

test("invalid employee payloads and duplicate list IDs are rejected", async (t) => {
  const { employeeAPI } = await loadService();
  const invalidLists = [
    null,
    employee,
    [null],
    [{ ...employee, id: "2" }],
    [{ ...employee, id: 0 }],
    [{ ...employee, id: 2.5 }],
    [{ ...employee, salary: "20000" }],
    [{ ...employee, salary: null }],
    [{ ...employee, department: undefined }],
    [employee, { ...employee }],
  ];
  const count = invalidLists.length;
  t.mock.method(globalThis, "fetch", async () =>
    Response.json(success(invalidLists.shift())),
  );

  for (let index = 0; index < count; index++) {
    await assert.rejects(employeeAPI.list(), { name: "ApiError", status: 502 });
  }
});

test("invalid create IDs and update payloads are rejected", async (t) => {
  const { employeeAPI } = await loadService();
  const responses = [success("4"), success(0), success(null), success(true)];
  t.mock.method(globalThis, "fetch", async () => Response.json(responses.shift()));

  await assert.rejects(employeeAPI.create(input), { name: "ApiError", status: 502 });
  await assert.rejects(employeeAPI.create(input), { name: "ApiError", status: 502 });
  await assert.rejects(employeeAPI.update(2, input), { name: "ApiError", status: 502 });
  await assert.rejects(employeeAPI.update(2, input), { name: "ApiError", status: 502 });
});

test("delete false is a failure and a non-boolean delete result is invalid", async (t) => {
  const { employeeAPI } = await loadService();
  const responses = [success(false), success("true")];
  t.mock.method(globalThis, "fetch", async () => Response.json(responses.shift()));

  await assert.rejects(employeeAPI.delete(2), { name: "ApiError", status: 409 });
  await assert.rejects(employeeAPI.delete(2), { name: "ApiError", status: 502 });
});

test("invalid IDs reject before making any request", async (t) => {
  const { employeeAPI } = await loadService();
  const fetchMock = mockResponse(t, success(employee));
  const invalidIds = [0, -1, 1.5, NaN, Infinity, 2147483648, "", " ", "1.5", "2/3", "abc"];

  for (const id of invalidIds) {
    await assert.rejects(employeeAPI.get(id), { name: "ApiError", status: 400 });
    await assert.rejects(employeeAPI.update(id, input), { name: "ApiError", status: 400 });
    await assert.rejects(employeeAPI.delete(id), { name: "ApiError", status: 400 });
  }
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("aborted requests preserve the original abort error", async (t) => {
  const { employeeAPI } = await loadService();
  const controller = new AbortController();
  controller.abort();
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    assert.equal(options.signal, controller.signal);
    options.signal.throwIfAborted();
  });

  await assert.rejects(employeeAPI.list(controller.signal), (error) => {
    assert.equal(error, controller.signal.reason);
    return true;
  });
});

test("aborting while reading the response body remains an abort error", async (t) => {
  const { employeeAPI } = await loadService();
  const controller = new AbortController();
  const body = new ReadableStream({
    start(stream) {
      controller.signal.addEventListener("abort", () => {
        stream.error(controller.signal.reason);
      });
    },
  });
  t.mock.method(globalThis, "fetch", async () => new Response(body));

  const result = employeeAPI.get(2, controller.signal);
  controller.abort();
  await assert.rejects(result, (error) => {
    assert.equal(error, controller.signal.reason);
    return true;
  });
});

test("network failure explains backend, certificate, and CORS checks", async (t) => {
  const { employeeAPI } = await loadService();
  t.mock.method(globalThis, "fetch", async () => {
    throw new TypeError("Failed to fetch");
  });

  await assert.rejects(employeeAPI.list(), (error) => {
    assert.equal(error.name, "ApiError");
    assert.equal(error.status, 0);
    assert.match(error.message, /backend/i);
    assert.match(error.message, /certificate/i);
    assert.match(error.message, /CORS/);
    return true;
  });
});

test("configured base URL is trimmed and has trailing slashes removed", async (t) => {
  const { employeeAPI } = await loadService("  https://example.test/api///  ");
  const fetchMock = mockResponse(t, success([]));

  await employeeAPI.list();
  assert.equal(fetchMock.mock.calls[0].arguments[0], "https://example.test/api/List");
});

test("blank base URL uses the user's localhost backend", async (t) => {
  const { employeeAPI } = await loadService("  ");
  const fetchMock = mockResponse(t, success([]));

  await employeeAPI.list();
  assertRequest(fetchMock, "/List", "GET");
});
