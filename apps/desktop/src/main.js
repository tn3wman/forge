"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var client_1 = require("react-dom/client");
var react_query_1 = require("@tanstack/react-query");
var App_1 = require("./App");
require("./globals.css");
var queryClient = new react_query_1.QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30000,
            retry: 1,
            refetchOnWindowFocus: true,
        },
    },
});
client_1.default.createRoot(document.getElementById("root")).render(<react_1.default.StrictMode>
    <react_query_1.QueryClientProvider client={queryClient}>
      <App_1.App />
    </react_query_1.QueryClientProvider>
  </react_1.default.StrictMode>);
