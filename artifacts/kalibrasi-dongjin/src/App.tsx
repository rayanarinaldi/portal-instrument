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
import { ThemeProvider } from "@/lib/theme";

import Dashboard from "@/pages/dashboard";
import Records from "@/pages/records";
import NewRecord from "@/pages/new-record";
import ViewRecord from "@/pages/view-record";
import EditRecord from "@/pages/edit-record";
import LoginPage from "@/pages/login";
import HistoryCard from "@/pages/history-card";
import UsersManagement from "@/pages/users-management";
import PublicHistoryPage from "@/pages/public-history";
import PreventiveChecklistPage from "@/pages/preventive/checklist";
import PreventiveIssuesPage from "@/pages/preventive/issues";
import DailyReportForemanPage from "@/pages/daily-report/foreman";
import DailyReportSectionChiefPage from "@/pages/daily-report/section-chief";
import LogsheetShiftPage from "@/pages/logsheet-shift";
import CollectDataPage from "@/pages/collect-data";
import MonitoringDashboardPage from "@/pages/monitoring-dashboard";

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
              <Route path="/daily-report/foreman" component={DailyReportForemanPage} />
              <Route path="/daily-report/section-chief" component={DailyReportSectionChiefPage} />
              <Route path="/preventive/checklist" component={PreventiveChecklistPage} />
              <Route path="/preventive/issues" component={PreventiveIssuesPage} />
              <Route path="/logsheet-shift" component={LogsheetShiftPage} />
              <Route path="/collect-data" component={CollectDataPage} />
              <Route path="/monitoring" component={MonitoringDashboardPage} />
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
        <ThemeProvider>
          <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <ProtectedRouter />
          </WouterRouter>
          </AuthProvider>
          <Toaster />
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;