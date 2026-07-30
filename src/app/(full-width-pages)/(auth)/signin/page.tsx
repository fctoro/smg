import SignInClient from "@/components/auth/SignInClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connexion | FC Toro",
  description: "Page de connexion pour la plateforme administrative de FC Toro",
};

export default function SignIn() {
  return <SignInClient />;
}
