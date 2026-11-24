import { useTranslation } from "react-i18next";

import { Seo } from "@/components/Seo";
import { LegalShell } from "@/components/site/LegalShell";

export function TermsPage() {
  const { t } = useTranslation();
  return (
    <>
      <Seo title={t("seo.terms.title")} description={t("seo.terms.description")} path="/terms" />
      <LegalShell eyebrow="Terms" title="Terms of use" updated="Last updated 23 November 2026">
        <p>
          These terms govern the Travel Safe API, the hourly notification worker, the website and the
          private emergency viewer (together, the “Service”). The Service is operated by{" "}
          <strong>The Makers</strong> as an open-source project. By creating an account or using the
          Service, you agree to these terms.
        </p>

        <h2>1. The Service</h2>
        <p>
          Travel Safe lets an account owner configure a check-in interval, save location points, add
          emergency contacts, upload SOS media or a message, and share a private emergency page. A
          scheduled worker warns the owner when a check-in is overdue and can trigger a dead-man switch
          that notifies the owner and their contacts.
        </p>

        <h2>2. Not an emergency service</h2>
        <p>
          <strong>Travel Safe does not replace police, ambulance, fire, rescue or any other emergency service.</strong>{" "}
          It sends notifications to addresses the owner configured. Delivery depends on networks,
          email providers, spam filters and recipient behaviour. We do not monitor alerts around the
          clock, do not guarantee that anyone will receive, read or act on a notification, and cannot
          dispatch help. If someone is in immediate danger, contact local emergency services.
        </p>

        <h2>3. Eligibility and authority</h2>
        <p>
          You must be old enough to enter a binding contract where you live. If you add an emergency
          contact, you confirm that you have the authority and any consent needed to share their name,
          email or phone number with the Service and to send them alerts.
        </p>

        <h2>4. Accounts and API keys</h2>
        <ul>
          <li>You are responsible for keeping your API key and private links secure.</li>
          <li>API keys are shown once and stored only as a hash. We cannot recover a lost key.</li>
          <li>Anyone with an emergency link can view the shared page. Revoke links that are no longer needed.</li>
          <li>You must provide accurate configuration. A wrong email address, interval or timezone can prevent an alert from being useful.</li>
        </ul>

        <h2>5. Acceptable use</h2>
        <p>You may not use the Service to:</p>
        <ul>
          <li>break the law, harass, threaten, stalk or harm anyone;</li>
          <li>upload malware, unlawful content, or content you do not have the right to share;</li>
          <li>send alerts you know to be false, or add contacts without a legitimate safety purpose;</li>
          <li>probe, overload, disrupt, reverse-engineer or bypass the security or rate limits of the Service;</li>
          <li>resell the hosted Service as if it were your own without complying with the open-source licence.</li>
        </ul>

        <h2>6. Your content</h2>
        <p>
          You keep ownership of the location data, messages, images, audio and video you upload. You
          grant the operator a limited licence to store, process and display that content solely to
          operate the Service and show it to people holding a valid link. You are responsible for the
          content and for having the rights needed to upload it.
        </p>

        <h2>7. Privacy</h2>
        <p>
          Our <a href="/privacy">privacy policy</a> explains what is stored, who can see it, how long it
          is kept and how to revoke access. It forms part of these terms.
        </p>

        <h2>8. Availability, changes and beta features</h2>
        <p>
          The Service is provided on an “as is” and “as available” basis. It may be changed, suspended or
          discontinued at any time, including features labelled beta. We do not promise any uptime,
          delivery time, retention period beyond what the documentation states, or compatibility with a
          particular client.
        </p>

        <h2>9. Third-party services</h2>
        <p>
          The hosted Service runs on Cloudflare and may use an email provider, push webhook or map link.
          Those providers have their own terms and privacy policies. If you self-host, you are the
          operator and are responsible for your own providers and compliance.
        </p>

        <h2>10. Disclaimers</h2>
        <p>
          To the maximum extent permitted by law, the Service is provided without warranties of any kind,
          including merchantability, fitness for a particular purpose, accuracy, and non-infringement.
          We do not warrant that alerts will be delivered, that location data will be accurate, or that
          the Service will be uninterrupted or error-free.
        </p>

        <h2>11. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, The Makers and contributors will not be liable for any
          indirect, incidental, special, consequential or punitive damages, or for loss of life, injury,
          loss of data, loss of profits or business interruption, arising from the use of or inability to
          use the Service. Where liability cannot be excluded, it is limited to the amount you paid to use
          the hosted Service in the twelve months before the claim, or ZAR 100 if you paid nothing.
        </p>

        <h2>12. Indemnity</h2>
        <p>
          You agree to indemnify the operator against claims, losses and costs arising from your content,
          your unlawful use of the Service, or your failure to obtain consent from an emergency contact,
          except to the extent caused by the operator's own wilful misconduct.
        </p>

        <h2>13. Termination</h2>
        <p>
          You may stop using the Service at any time and delete your account with{" "}
          <code>DELETE /v1/me</code>. We may suspend or terminate access if these terms are breached, if
          the Service is abused, or if required by law. Provisions that by their nature should survive
          termination will do so.
        </p>

        <h2>14. Open-source licence</h2>
        <p>
          The source code is released under the MIT License. These terms govern the hosted Service; the
          licence governs the code. Where they conflict for self-hosted deployments, the licence governs
          the code.
        </p>

        <h2>15. Governing law</h2>
        <p>
          These terms are governed by the laws of the Republic of South Africa, without regard to
          conflict-of-law rules. Courts located in South Africa have jurisdiction, unless mandatory
          consumer law gives you a different forum.
        </p>

        <h2>16. Contact</h2>
        <p>
          Questions about these terms can be raised through{" "}
          <a href="https://github.com/mindsgn/travel-safe/issues" target="_blank" rel="noreferrer">
            the project repository
          </a>
          . Do not post sensitive personal data in a public issue.
        </p>
      </LegalShell>
    </>
  );
}
