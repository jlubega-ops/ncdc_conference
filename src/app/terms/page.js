export const metadata = {
  title: "Terms of Service | NCDC Conference Platform",
};

export default function TermsPage() {
  return (
    <div className="bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold text-foreground">Terms of Service</h1>
        <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
          By using the NCDC Conference Management Platform, you agree to comply
          with all conference policies, submission guidelines, and registration
          terms set by the National Curriculum Development Centre and individual
          event organizers.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Misuse of the platform, including fraudulent registrations or plagiarized
          submissions, may result in account suspension and disqualification from
          current and future events.
        </p>
      </div>
    </div>
  );
}
