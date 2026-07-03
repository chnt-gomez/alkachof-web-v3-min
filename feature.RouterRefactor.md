### Routing refactor

# Problem
Alkachof has a solid routing mechanism but the routing logic itself lacks logic and is very difficult to navigate. 

## Components Architecture
Alkachof has a very simple access structure: Visitors can view catalogs and Owners can edit Catalogs and products. Following thet logic the current navigation strategy makes no semse: 

```javascript
export function AppRouter() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <ToastProvider>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/recover" element={<RecoverPage />} />
              <Route path="/reset/:token" element={<ResetPasswordPage />} />
              <Route path="/verify/:token" element={<VerifyEmailPage />} />
              <Route path="/catalog/:catalogId" element={<PublicCatalogPage />} />
              <Route element={<NavShell />}>
                <Route element={<ProtectedRoute />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/product/:id" element={<ProductPage />} />
                  <Route path="/edit/catalog/:catalogId" element={<CatalogPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                </Route>
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </ErrorBoundary>
    </BrowserRouter>
  )
}

````

CatalogPage should be refactored so the owner of the catalog can simply go to /catalog. The authentication token provided should be enough for the backend to recognize the ownership and fetch the catalog owner id along with the catalog details. You can see the swagger.js file with the full definition of the endpoints.

## Acceptance criteria

Remove the URL /edit/catalog/:catalogId and use instead /catalog.
The redirection should work and re route the authenticated user to its actual catalog
Use the swagger file to see how to get a catalog from the API using the token of the owner