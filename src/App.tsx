import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AdminRoute } from "@/components/admin/AdminRoute";
import { EditorRoute } from "@/components/admin/EditorRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Demo from "./pages/Demo";
import Dashboard from "./pages/Dashboard";
import MyCourses from "./pages/MyCourses";
import Courses from "./pages/Courses";
import Course from "./pages/Course";
import Certificates from "./pages/Certificates";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminCourses from "./pages/admin/AdminCourses";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminQuizzes from "./pages/admin/AdminQuizzes";
import AdminSiteSettings from "./pages/admin/AdminSiteSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/my-courses" element={<MyCourses />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/course/:id" element={<Course />} />
          <Route path="/certificates" element={<Certificates />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/courses" element={<AdminRoute><AdminCourses /></AdminRoute>} />
          <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
          <Route path="/admin/quizzes" element={<EditorRoute><AdminQuizzes /></EditorRoute>} />
          <Route path="/admin/settings" element={<AdminRoute><AdminSiteSettings /></AdminRoute>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
