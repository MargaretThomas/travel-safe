import { useTranslation } from "react-i18next";

import { Seo } from "@/components/Seo";
import { LegalShell } from "@/components/site/LegalShell";

export function PrivacyPage() {
  const { t } = useTranslation();
  return (
    <>
      <Seo title={t("seo.privacy.title")} description={t("seo.privacy.description")} path="/privacy" />
      <LegalShell eyebrow="Privacy" title="Privacy policy" updated="Last updated 23 November 2026">
        <p>
          Travel Safe is an open-source personal safety service operated by <strong>The Makers</strong>{" "}
          (“we”, “us”). This policy explains what the service stores, why, who can see it, and how to
          remove it. It covers the API, the hourly notification worker, the landing site and the private
          emergency viewer.
        </p>
        <p>
          Travel Safe is a safety net, not an emergency service. It notifies the people an account owner
          chooses. It does not contact police, ambulance, fire or other emergency services.
        </p>

        <h2>1. Summary</h2>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Why</th>
              <th>Retention</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Name, optional email and phone</td>
              <td>Identify the account and send warnings</td>
              <td>Until the account is deleted</td>
            </tr>
            <tr>
              <td>Emergency contacts (name, email, phone)</td>
              <td>Notify the people the owner chose</td>
              <td>Until removed by the owner or the account is deleted</td>
            </tr>
            <tr>
              <td>GPS points</td>
              <td>Show the last known location and a 7-day trail</td>
              <td>7 days, then deleted by the hourly worker</td>
            </tr>
            <tr>
              <td>SOS media and messages</td>
              <td>Show what the owner chose to share during an emergency</td>
              <td>Until the account is deleted or the owner requests deletion</td>
            </tr>
            <tr>
              <td>Check-ins, emergency events, notification logs</td>
              <td>Operate the switch, deduplicate alerts and audit delivery</td>
              <td>Pruned after 90 days</td>
            </tr>
            <tr>
              <td>API key hash, emergency tokens</td>
              <td>Authenticate the owner and private links</td>
              <td>Until rotated, revoked or the account is deleted</td>
            </tr>
          </tbody>
        </table>

        <h2>2. Information we process</h2>
        <h3>Account and configuration</h3>
        <p>
          A name is required to create an account. Email, phone, check-in interval, grace period and
          timezone are optional. API keys are stored only as SHA-256 hashes; the plaintext key is shown
          once at creation and cannot be recovered.
        </p>
        <h3>Emergency contacts</h3>
        <p>
          Contacts require a name plus an email address or phone number. Each contact is given a random
          access token that can be revoked independently. The account owner is responsible for telling
          their contacts that they have been added and for obtaining any consent required in their
          jurisdiction.
        </p>
        <h3>Location</h3>
        <p>
          Location points are saved only when a client sends them to <code>POST /v1/locations</code> or
          includes one in a check-in. The API does not run background tracking and does not collect
          location on its own. Points older than 7 days are deleted.
        </p>
        <h3>SOS media and messages</h3>
        <p>
          When an owner sends an SOS, the uploaded video, audio, image, caption or message is stored in
          a private Cloudflare R2 bucket. It is available only through a token-checked API route. Upload
          size is limited to 25 MB.
        </p>
        <h3>Emergency events and notifications</h3>
        <p>
          We record when an emergency starts or resolves and whether an alert was sent, skipped or
          failed. This prevents duplicate emails and lets us diagnose delivery failures. Notification
          logs are pruned after 90 days.
        </p>
        <h3>Local browser storage</h3>
        <p>
          The website stores your language and theme preference in <code>localStorage</code>. We do not
          use advertising cookies, third-party analytics or tracking pixels.
        </p>

        <h2>3. Who can see your data</h2>
        <ul>
          <li><strong>The account owner</strong>, authenticated with the API key.</li>
          <li>
            <strong>Anyone holding a private emergency link</strong>, including the owner's link and each
            contact's link. A link shows the person's name, active emergency status, last 7 days of
            locations and SOS media. It does not show the contact list or account email and phone.
          </li>
          <li>
            <strong>Service processors</strong>: Cloudflare (Workers, D1, R2, and optionally Email
            Service), an email provider such as Resend if configured, and an optional push webhook
            operator. They process data to deliver the service.
          </li>
        </ul>
        <p>
          Links can be revoked at any time with <code>POST /v1/contacts/:id/revoke</code>, or rotated
          with <code>POST /v1/emergency-link/rotate</code>. Revocation invalidates the page and its
          media URLs. Anyone who saved the content before revocation may still have a copy.
        </p>

        <h2>4. Why we process it</h2>
        <p>
          We process this data to perform the service the owner requested: run the check-in switch,
          notify chosen contacts, display the private emergency page, secure accounts and diagnose
          failures. Where consent is required, it is given when the owner creates an account or adds a
          contact. The owner is responsible for the consent of their emergency contacts.
        </p>

        <h2>5. Sharing and transfers</h2>
        <p>
          We do not sell personal data, use it for advertising or build marketing profiles. Data is
          processed by Cloudflare's global network and may be stored or processed outside South Africa.
          Transfers rely on the contractual safeguards of the relevant providers. Optional processors
          are enabled only when the operator configures them.
        </p>

        <h2>6. Retention and deletion</h2>
        <ul>
          <li>Location points: deleted after 7 days by the hourly worker.</li>
          <li>Check-ins, resolved emergency events and notification logs: pruned after 90 days.</li>
          <li>SOS media and messages: kept until the account is deleted or deletion is requested.</li>
          <li>Account, contacts, tokens and configuration: kept until deleted or revoked.</li>
        </ul>
        <p>
          <code>DELETE /v1/me</code> removes the user, contacts, locations, check-ins, SOS records,
          emergency events and stored media. Cloudflare D1 point-in-time recovery may retain database
          snapshots for up to 30 days, and infrastructure backups may persist for a limited period before
          expiring. Legal obligations may require us to retain specific records longer.
        </p>

        <h2>7. Security</h2>
        <p>
          API keys are hashed, emergency tokens are random 256-bit values, media lives in a private
          bucket, and responses set <code>no-store</code> where appropriate. The service is provided
          as-is by an open-source project. No system is perfectly secure, so avoid putting information in
          an SOS that you would not want disclosed if a link leaked.
        </p>

        <h2>8. Your rights</h2>
        <p>
          Depending on your jurisdiction, you may have the right to access, correct, delete, restrict or
          object to the processing of your personal data, and to lodge a complaint with a regulator. The
          API supports profile updates and account deletion. For other requests, open a private security
          advisory or a GitHub issue on the project repository and we will route it appropriately.
        </p>
        <p>
          South African residents may contact the Information Regulator (South Africa) at{" "}
          <a href="https://inforegulator.org.za/" target="_blank" rel="noreferrer">
            inforegulator.org.za
          </a>
          .
        </p>

        <h2>9. Children</h2>
        <p>
          Travel Safe is intended for adults who can consent to the processing described here. It is not
          directed at children, and we do not knowingly collect data from children.
        </p>

        <h2>10. Changes and contact</h2>
        <p>
          We may update this policy when the service changes. The date at the top tells you when it last
          changed. For privacy questions, contact the project through{" "}
          <a href="https://github.com/mindsgn/travel-safe/issues" target="_blank" rel="noreferrer">
            the public repository
          </a>
          . Do not include sensitive personal data in a public issue.
        </p>
      </LegalShell>
    </>
  );
}
