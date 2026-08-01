import SignUpForm from "@/components/auth/SignUpForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inscription | FC Toro",
  description: "Page d'inscription pour la plateforme administrative de FC Toro",
};

export default function SignUp() {
  return <SignUpForm />;
}
