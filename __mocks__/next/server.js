// Mock NextRequest and NextResponse for tests
class MockHeaders {
  constructor(init = {}) {
    this.headers = new Map(Object.entries(init));
  }

  get(key) {
    return this.headers.get(key) || null;
  }

  set(key, value) {
    this.headers.set(key, value);
  }
}

class NextRequest {
  constructor(url, init = {}) {
    this.url = url;
    this.method = init.method || "GET";
    this.headers = new MockHeaders(init.headers || {});
    this.body = init.body;
    this._bodyUsed = false;

    // Parse URL to create nextUrl
    const parsedUrl = new URL(url);
    this.nextUrl = {
      searchParams: parsedUrl.searchParams,
    };
  }

  json() {
    if (this._bodyUsed) {
      return Promise.reject(new Error("Body has already been consumed"));
    }
    this._bodyUsed = true;

    if (typeof this.body === "string") {
      try {
        return Promise.resolve(JSON.parse(this.body));
      } catch (e) {
        return Promise.reject(new Error("Invalid JSON"));
      }
    }
    return Promise.resolve({});
  }
}

class NextResponse {
  constructor(body, init = {}) {
    this.body = body;
    this.status = init.status || 200;
    this.headers = new MockHeaders(init.headers || {});
  }

  json() {
    return Promise.resolve(this.body);
  }

  static json(body, init = {}) {
    return new NextResponse(body, init);
  }
}

module.exports = {
  NextRequest,
  NextResponse,
};
