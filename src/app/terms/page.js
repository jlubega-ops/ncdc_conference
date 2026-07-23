export const metadata = {
  title: "Terms of Service | Conference Management",
};

export default function TermsPage() {
  return (
    <div className="bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold text-foreground">Terms of Service</h1>
        <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
          By using Conference Management, you agree to comply with conference policies, submission
          guidelines, and registration terms set by event organisers.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Misuse of the platform, including fraudulent registrations or plagiarised submissions,
          may result in account suspension and disqualification from current and future events.
        </p>
      </div>
    </div>
  );
}
