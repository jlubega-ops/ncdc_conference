export const metadata = {
  title: "Privacy Policy | NCDC Conference Platform",
};

export default function PrivacyPage() {
  return (
    <div className="bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
        <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
          The NCDC Conference Management Platform collects and processes personal
          data in accordance with applicable data protection laws. Information
          submitted through registration forms, paper submissions, and account
          creation is used solely for conference administration purposes.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          For questions about how your data is handled, contact{" "}
          <a href="mailto:privacy@ncdc.go.ug" className="text-primary hover:underline">
            privacy@ncdc.go.ug
          </a>
          .
        </p>
      </div>
    </div>
  );
}
