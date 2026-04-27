import ReportsPage from "@/pages/reports";
import StickerPage from "@/pages/sticker";
import PublicCalibration from "@/pages/public-calibration";
import BulkStickerPage from "@/pages/bulk-sticker";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@/contexts/auth-context";

import Dashboard from "@/pages/dashboard";
import Records from "@/pages/records";
import NewRecord from "@/pages/new-record";
import ViewRecord from "@/pages/view-record";
import EditRecord from "@/pages/edit-record";
import LoginPage from "@/pages/login";
import HistoryCard from "@/pages/history-card";
import UsersManagement from "@/pages/users-management";
import PublicHistoryPage from "@/pages/public-history";

const queryClient = new QueryClient();

function ProtectedRouter() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Memuat...</div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/public/calibration/:id" component={PublicCalibration} />
      <Route path="/public/history/:tagNo" component={PublicHistoryPage} />

      {!user ? (
        <Route>
          <LoginPage />
        </Route>
      ) : (
        <Route>
          <Layout>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/records" component={Records} />
              <Route path="/new" component={NewRecord} />

              <Route path="/records/:id/sticker" component={StickerPage} />
              <Route path="/bulk-sticker" component={BulkStickerPage} />
              <Route path="/records/:id/edit" component={EditRecord} />
              <Route path="/records/:id" component={ViewRecord} />

              <Route path="/history-card" component={HistoryCard} />
              <Route path="/reports" component={ReportsPage} />
              <Route path="/users" component={UsersManagement} />
              <Route component={NotFound} />
            </Switch>
          </Layout>
        </Route>
      )}
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <ProtectedRouter />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;