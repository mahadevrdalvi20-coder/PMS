import { redirect } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import { AuthFrame } from "@/components/auth-frame";
import { Icon, buttonClass } from "@/components/ui";
import { lookupCurrentUser } from "@/lib/session";

export const metadata = { title: "Account not set up" };

// Shown when someone has a Clerk login but no (active) employee record.
export default async function NotRegisteredPage() {
  const result = await lookupCurrentUser();
  if (result.status === "signed_out") redirect("/sign-in");
  if (result.status === "ok") redirect("/dashboard");

  const inactive = result.status === "inactive";
  return (
    <AuthFrame>
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-50 text-amber-700">
          <Icon name="lock" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-slate-900">{inactive ? "Your account is inactive" : "Your account is not yet set up"}</h1>
        <p className="mt-2 text-sm text-slate-600">
          {inactive ? (
            "Your employee record has been deactivated. Please contact HR if you think this is a mistake."
          ) : (
            <>
              We could not find an employee record for{" "}
              <strong className="text-slate-900">{result.status === "not_registered" && result.email ? result.email : "this e-mail"}</strong>. Please
              contact HR and ask them to add you with this exact e-mail address.
            </>
          )}
        </p>
        <div className="mt-6">
          <SignOutButton redirectUrl="/">
            <button className={buttonClass("secondary")}>Sign out</button>
          </SignOutButton>
        </div>
      </div>
    </AuthFrame>
  );
}
