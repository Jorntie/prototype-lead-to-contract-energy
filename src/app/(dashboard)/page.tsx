import { redirect } from "next/navigation";

// Default landing page redirects based on role
// For MVP: redirect to actions (rep default)
// TODO: After auth is wired, check role and redirect accordingly
export default function HomePage() {
  redirect("/actions");
}
