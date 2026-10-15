import PageMeta from '../components/PageMeta';
import { useLanguage } from '../context/LanguageContext';

function StaticPage({ title, updated, metaDescription, canonical, children }) {
  return (
    <div className="max-w-2xl mx-auto px-5 sm:px-8 py-16">
      <PageMeta title={`${title} — Beantrip`} description={metaDescription} canonical={canonical} />
      <h1 className="font-display text-3xl font-semibold mb-2">{title}</h1>
      {updated && <p className="text-xs text-[var(--color-muted-fg)] mb-6">Last updated {updated}</p>}
      <div className="prose prose-sm text-[var(--color-muted-fg)] space-y-4">{children}</div>
    </div>
  );
}

function H2({ children }) {
  return <h2 className="font-display text-lg font-semibold text-[var(--color-fg)] mt-8 mb-2">{children}</h2>;
}

export function Privacy() {
  const { t } = useLanguage();
  return (
    <StaticPage
      title="Privacy Policy"
      updated="August 2026"
      canonical="/privacy"
      metaDescription="How Beantrip collects, uses, and protects your data, and the choices you have about it."
    >
      <p>
        Beantrip ("we", "us") helps you discover specialty coffee shops. This page explains what
        information we collect, why, and what control you have over it.
      </p>

      <H2>What we collect</H2>
      <p>When you create an account: your email address, name, and a hashed version of your password
        (we never store your password itself).</p>
      <p>What you add to your profile: a location and bio you write, and a profile photo you upload.</p>
      <p>What you tell us about yourself (all optional, asked at sign-up or editable anytime in your
        Profile): gender, age range, your typical spend per coffee visit, your occupation, your
        favorite roast and brewing method, and how you heard about Beantrip. You can skip any of these
        or leave them blank — nothing here is required to use the app.</p>
      <p>What you do in the app: shops you favorite or mark as visited, reviews and ratings you post,
        and shop suggestions you submit.</p>
      <p>Device and notification data: if you turn on push notifications, we store a device token so we
        can deliver them. You can turn this off at any time from your profile.</p>
      <p>Location for "Near Me": if you use the Near Me feature, your browser's GPS coordinates are sent
        to our server for that one search only, to find nearby cafes. We don't save these coordinates or
        link them to your account.</p>

      <H2>How we use it</H2>
      <p>To run the core features of the app — showing your profile, your saved and visited shops, your
        reviews, and personalized nearby results and recommendations — and to send you notifications
        you've opted into. The optional profile details above help us understand who's using Beantrip
        so we can improve recommendations and, going forward, may also be used to make in-app
        promotions and offers more relevant to you. We don't sell your personal data to third parties,
        and if we start sharing profile data with an advertising partner for targeting purposes, we'll
        update this policy first and ask for your consent where required by law.</p>

      <H2>Who we share it with</H2>
      <p>We use a small number of service providers to run Beantrip: Google (Maps, Places, and photo
        data; Firebase for photo storage and push notifications) and Resend (for account emails like
        password resets). They process data only as needed to provide these services to us.</p>

      <H2>How long we keep it</H2>
      <p>We keep your account data for as long as your account exists. You can delete your account at
        any time from your Profile page — this permanently removes your profile, reviews, favorites,
        visited shops, and photo.</p>

      <H2>Your choices</H2>
      <p>You can view and edit your profile information — including all the optional details above —
        change your email, reset your password, turn notifications on or off, and delete your account
        entirely — all from the Profile page, without needing to contact us. If you'd like to reach us
        about anything else, see the contact details on our{' '}
        <a href="/impressum" className="text-[var(--color-accent)] font-semibold hover:underline">{t('footer.impressum')}</a> page.</p>

      <H2>Cookies and local storage</H2>
      <p>Your sign-in session and preferences (like your language choice) are kept in your browser's
        local storage, not a cookie, and aren't shared with third parties. We don't currently use any
        analytics or advertising cookies, and no tracking of any kind happens when you use Beantrip. If
        that changes in the future, we'll ask for your permission first and update this policy before
        anything starts.</p>

      <H2>Changes to this policy</H2>
      <p>If this policy changes in a meaningful way, we'll update the date at the top of this page.</p>
    </StaticPage>
  );
}

export function Terms() {
  const { t } = useLanguage();
  return (
    <StaticPage
      title="Terms of Service"
      updated="July 2026"
      canonical="/terms"
      metaDescription="The terms you agree to when creating an account or using Beantrip."
    >
      <p>By creating an account or using Beantrip, you agree to these terms.</p>

      <H2>Your account</H2>
      <p>You're responsible for keeping your login details secure and for what happens under your
        account. Please give us accurate information when you register.</p>

      <H2>Content you post</H2>
      <p>Reviews, ratings, and shop suggestions you submit are your own words — you keep ownership of
        them, but by posting you allow us to display them within the app. Please keep reviews honest
        and relevant to your actual experience, and don't post anything abusive, false, or that
        infringes someone else's rights. We may remove content that breaks these rules.</p>

      <H2>Shop suggestions</H2>
      <p>Shops suggested through "Add a Spot" are reviewed before they're published. We may edit,
        decline, or delay publishing a suggestion at our discretion.</p>

      <H2>Acceptable use</H2>
      <p>Don't use Beantrip to do anything illegal, to impersonate someone else, to scrape or misuse
        the service, or to interfere with other users' experience. We may suspend or delete accounts
        that misuse the service.</p>

      <H2>No warranty</H2>
      <p>Beantrip is provided "as is." Shop details like hours, addresses, and photos are gathered
        from public sources and user contributions and may occasionally be inaccurate or out of date —
        always double-check before visiting somewhere unfamiliar.</p>

      <H2>Liability</H2>
      <p>To the extent permitted by law, we're not liable for indirect or incidental damages arising
        from your use of the app.</p>

      <H2>Ending your account</H2>
      <p>You can delete your account at any time from your Profile page. We may suspend or terminate
        accounts that violate these terms.</p>

      <H2>Contact</H2>
      <p>Questions about these terms? See the contact details on our{' '}
        <a href="/impressum" className="text-[var(--color-accent)] font-semibold hover:underline">{t('footer.impressum')}</a> page.</p>
    </StaticPage>
  );
}

export function Impressum() {
  const { t } = useLanguage();
  return (
    <StaticPage
      title={t('footer.impressum')}
      canonical="/impressum"
      metaDescription="Legal disclosure and contact details for Beantrip, in accordance with German law (§ 5 TMG)."
    >
      <H2>Information pursuant to § 5 TMG (German Telemedia Act)</H2>
      <p>
        Lucas Feiler<br />
        Auf dem Kyberg 9<br />
        82041 Oberhaching<br />
        Germany
      </p>

      <H2>Contact</H2>
      <p>Email: hello@beantrip.com</p>

      <H2>Responsible for content (§ 18 Abs. 2 MStV)</H2>
      <p>Lucas Feiler, address as above.</p>

      <H2>Liability for content</H2>
      <p>As a private individual, I make every effort to keep the information on this site accurate and
        up to date, but I can't guarantee its completeness or accuracy. Shop details in particular are
        gathered from public sources and user contributions and may be outdated.</p>

      <H2>Liability for links</H2>
      <p>This site links to external websites (e.g. shop websites and Instagram pages) over whose
        content I have no control and for which I accept no liability. The respective operator is
        responsible for the content of linked pages.</p>

      <H2>Dispute resolution</H2>
      <p>The European Commission provides a platform for online dispute resolution (OS) at{' '}
        <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noreferrer" className="text-[var(--color-accent)] font-semibold hover:underline">ec.europa.eu/consumers/odr</a>.
        I'm not obligated and not willing to participate in dispute resolution proceedings before a
        consumer arbitration board.</p>
    </StaticPage>
  );
}
