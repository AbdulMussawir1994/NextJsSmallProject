# Employee Manager

A small employee CRUD application using the installed Next.js 16.4.6, React 19.3, and TypeScript. Create, list, view, edit, and delete records through your ASP.NET Core API at `https://localhost:7047`.

## Run locally

Start your backend, then run:

```bash
npm install
npm run dev
```

Open http://localhost:3000 or http://localhost:3000/employees. Each CRUD action has its own page folder; reusable components keep those pages small. The app uses the backend directly.

The API URL defaults to `https://localhost:7047`. To change it, optionally copy the example configuration in PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Edit `NEXT_PUBLIC_API_BASE_URL` in `.env.local`, then restart the dev server. Public environment variables are included at build time, so rebuild for production after changing this URL.

## UI packages

Bootstrap CSS is loaded globally through `app/bootstrap.css` in the root layout. Use Bootstrap classes such as `btn btn-primary`, `row`, and `col-md-6` in JSX.

React Bootstrap supplies interactive components such as modals and dropdowns. Import individual components inside a Client Component with `"use client"`, for example `import Modal from "react-bootstrap/Modal"`. React Bootstrap manages their behavior through React props and state. See the [React Bootstrap documentation](https://react-bootstrap.github.io/docs/getting-started/introduction/).

Tailwind CSS 4 uses the existing Turbopack loader. Its utilities use the `tw:` prefix, for example `className="tw:flex tw:gap-4"`. The CSS layer order is Tailwind theme, Bootstrap, application styles, then Tailwind utilities. Tailwind imports its theme and utilities to preserve the application's existing base styles. See the [Tailwind configuration guidance](https://tailwindcss.com/docs/preflight#disabling-preflight).

jQuery is initialized in the browser after hydration by `components/jquery-setup.tsx` and becomes available as `window.$` and `window.jQuery`. For component code that depends on jQuery being ready, load it directly inside an effect or event handler with `const { default: $ } = await import("jquery")`. Scope jQuery plugins to a ref-owned element and clean up their handlers and instances when the component unmounts.

## Model and API contract

```ts
type Employee = {
  id: number;
  name: string;
  department: string;
  salary: number;
};

type GenericResponse<T> = {
  data: T;
  isSuccess: boolean;
  message: string;
  status: number;
};
```

These routes match the backend's OpenAPI definition. All responses use the wrapper above:

| Method | Endpoint | Request body | Response `data` |
| --- | --- | --- | --- |
| GET | `/List` | — | `Employee[]` |
| GET | `/GetById/{id}` | — | `Employee` |
| POST | `/Add` | Employee with `id: 0` | New employee ID (`number`) |
| PUT | `/Update` | Employee with its existing ID | Updated `Employee` |
| DELETE | `/Delete/{id}` | — | `boolean` |

The shared form edits name, department, and salary. Names and departments are required; salary accepts zero or more with two decimal places. IDs come from the backend. Successful saves open the employee's details and show the backend message. Deletion has its own confirmation page and returns to the list after success.

The API service validates response shapes and checks both HTTP status and `isSuccess`/`status` in the response. Backend failure messages are displayed even when HTTP status is 200. A shared hook handles loading, errors, retries, and cancellation when a page is hidden or unmounted. Spinners show during every API operation.

## Local HTTPS and CORS

If the browser cannot reach the API, first confirm that the backend is running. Trust the ASP.NET Core development certificate using:

```bash
dotnet dev-certs https --trust
```

Restart the backend if needed, then open https://localhost:7047/List in your browser to verify that HTTPS works. Keep TLS verification enabled. See Microsoft's [development certificate guide](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-dev-certs).

The backend must also allow the frontend origin. Its current CORS preflight accepts `http://localhost:3000`; if you need to configure this in `Program.cs`, a named policy can use:

```csharp
builder.Services.AddCors(options =>
    options.AddPolicy("EmployeeFrontend", policy => policy
        .WithOrigins("http://localhost:3000")
        .AllowAnyHeader()
        .AllowAnyMethod()));

var app = builder.Build();
app.UseCors("EmployeeFrontend");
// Keep the existing authentication, authorization, and endpoint mappings here.
```

Place `UseCors` after explicit `UseRouting`, if present, and before authentication, authorization, and endpoint execution. Update the allowed origin if the frontend uses a different host or port. See Microsoft's [ASP.NET Core CORS guide](https://learn.microsoft.com/en-us/aspnet/core/security/cors).

## Checks and production

```bash
npm test
npm run build
npm start
```

Contract tests use mocked fetch responses; they do not create, update, or delete records in the running backend. Production requires a browser-accessible API URL, a trusted HTTPS certificate, and CORS configured for the deployed frontend origin.

## Pages and shared code

```text
app/
  page.tsx                       # Reuse the employee list as the home page
  employees/
    page.tsx                     # List
    add/page.tsx                 # Create
    [id]/
      page.tsx                   # View
      edit/page.tsx              # Update
      delete/page.tsx            # Delete confirmation
      loading.tsx                # Route spinner
```

- `components/employee-list.tsx`: employee table.
- `components/employee-form.tsx`: shared create/edit form with native inputs and FormData.
- `components/employee-record.tsx`: load one employee for view, edit, or delete.
- `components/employee-delete.tsx`: confirmed deletion.
- `components/employee-route.tsx`: shared Suspense boundary for dynamic route data.
- `components/employee-ui.tsx`: headings, loading states, errors, and busy buttons.
- `hooks/use-api-data.ts`: reusable reads with cancellation and retry.
- `externals/api-service.ts`: typed API calls and response validation.
- `model/model.ts`: employee and generic response types.
- `lib/format.ts`: shared salary formatting.
