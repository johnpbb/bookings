/**
 * lib/whaleContent.ts
 * Staff-editable wording for the whale booking form and confirmation email.
 * Holds the default text plus pure helpers, so it is safe to import from client components.
 * Saved values live in the Setting table; anything blank falls back to these defaults.
 */

export const WHALE_CONTENT_KEYS = [
  'whale_form_guest_heading',
  'whale_form_guest_intro',
  'whale_form_guest_example',
  'whale_form_ack_intro',
  'whale_form_ack_items',
  'email_whale_body',
] as const

export interface WhaleFormContent {
  guestHeading: string
  guestIntro: string
  guestExample: string
  ackIntro: string
  ackItems: string[]
}

export function isWhaleTour(tourId: string): boolean {
  return tourId.startsWith('whale_')
}

export const DEFAULT_WHALE_FORM: WhaleFormContent = {
  guestHeading: 'Guest Details & Special Requests',
  guestIntro:
    '<p>Please provide the following information for each guest:</p>' +
    '<ul>' +
    '<li><p>Full Name &amp; Age</p></li>' +
    '<li><p>Any Dietary Requirements or Allergies</p></li>' +
    '<li><p>Relevant medical conditions / physical limitations</p></li>' +
    '<li><p>Swimming &amp; Snorkeling ability</p></li>' +
    '</ul>',
  guestExample: [
    'Example:',
    '',
    'Guest 1: John Smith, 54, no dietary, no medical / limited movement in right knee, confident swimmer but limited snorkeling experience.',
    '',
    'Guest 2: Jane Smith, 18, vegetarian, no medical, wear contacts, experienced snorkelling',
    '',
    'Please include details for every guest.',
  ].join('\n'),
  ackIntro:
    'IMPORTANT: I understand and acknowledge on behalf of myself and all guests included in this booking that:',
  ackItems: [
    '<p>I have read and accept Tahi Tonga’s <a href="https://tahitonga.com/terms-conditions/" target="_blank" rel="noopener noreferrer">Terms &amp; Conditions</a></p>',
    '<p>I understand that whale swimming takes place in the open ocean, where sea conditions at times can be rough and physically demanding. I understand that this activity requires a reasonable level of physical fitness and swimming ability, including the ability to swim wearing fins, a mask and snorkel, and for the participant to be able to manage themselves in open water conditions and climb a boat ladder.</p>',
    '<p>I acknowledge that limitations in participants\' abilities may restrict opportunities to swim with whales and limit the overall personal experience.</p>',
    '<p>I understand that spending an extended period on the ocean can cause seasickness. I understand that participants should take appropriate preventative medication before departure, following the medication instructions and relevant medical advice. I accept responsibility for managing seasickness prevention.</p>',
    '<p>I understand that whale swimming is a regulated and natural wildlife experience, not a guaranteed swimming or viewing encounter. Whale Behaviour, ocean conditions and regulations can determine when and whether swimming opportunities are possible. I understand that there is no guarantee that participants will be able to enter the water or swim with whales.</p>',
  ],
}

const MAP_URL = 'https://maps.app.goo.gl/vYvxo95vYYk99nFy8?g_st=ic'
const WAIVER_URL = 'https://tahitonga.com/form-of-waiver-indemnity/'
const FAQ_URL = 'https://tahitonga.com/faqs/'

const ul = (items: string[]) => `<ul>${items.map((i) => `<li><p>${i}</p></li>`).join('')}</ul>`

export const DEFAULT_WHALE_EMAIL_BODY = [
  '<h2>Meeting Point</h2>',
  '<p>Please arrive at <strong>Faua Wharf, Nuku’alofa, Tongatapu at 8:00 AM.</strong></p>',
  `<p><a href="${MAP_URL}">Click here for the meeting location</a></p>`,
  '<p>Please arrive wearing your swimwear, ready to put your wetsuit on over the top. We will provide your wetsuit, fins, mask and snorkel.</p>',
  '<p>You will also be required to sign our Trip Waiver &amp; Indemnity. We recommend reading this before your trip so you understand what you are signing.</p>',
  `<p><a href="${WAIVER_URL}">Read the Trip Waiver &amp; Indemnity here</a></p>`,
  '<p><strong>Our planned schedule:</strong></p>',
  ul([
    'Arrival at Faua Wharf: 8:00 AM',
    'Planned departure: 8:30 AM',
    'Expected return to Faua Wharf: Approximately 3:30 PM',
  ]),
  '<p>Please understand that these are approximate times. We operate in an open ocean environment, and our schedule can change depending on sea conditions, operational considerations and wildlife activity.</p>',
  '<h2>Inclusions</h2>',
  ul([
    'All required snorkelling equipment, including wetsuit, fins, mask and snorkel.',
    'Morning tea: Hot drinks and cake.',
    'Light lunch: Roll/sandwich, drinking coconut and local fruit',
    'Water refills (bring your own bottle)',
    'Jackets',
  ]),
  '<h2>What to Bring</h2>',
  '<h3>Sun Protection &amp; Personal Items</h3>',
  ul([
    'Any personal medication you may need during the day.',
    'Sun protection (reef-conscious sunscreen, hat and sunglasses).',
    'A water bottle (which can be refilled on board).',
    'Towel and dry clothes for after your trip.',
  ]),
  '<h3>Seasickness Medication – Please Take This Seriously</h3>',
  '<p>Seasickness is one of the most common things that can affect your enjoyment of the day.</p>',
  '<p>Our trips involve extended periods offshore with the boat drifting and changing direction while tracking whales. These conditions can cause seasickness even in people who are usually comfortable on boats.</p>',
  '<p><strong><em>Even if you don\'t normally get seasick, please take precautions.</em></strong></p>',
  '<p>Once seasickness sets in, it can be difficult to manage and can significantly affect your ability to participate in and enjoy the experience.</p>',
  '<h3>Physical Fitness &amp; What to Expect</h3>',
  '<p>Whale swimming is a physically demanding ocean activity. It involves spending extended periods on a moving boat, entering and exiting the water, swimming with fins and snorkelling in open ocean conditions.</p>',
  '<p>You may encounter:</p>',
  ul([
    'Ocean swell, waves, currents and choppy water.',
    'Repeated entries and exits from the water throughout the day.',
    'Swimming distances that can vary depending on whale movements and conditions.',
    'Periods of waiting, searching and moving between locations.',
    'Bumpy boat rides',
  ]),
  '<p>To get the most out of this experience you should be reasonably comfortable swimming in open water and confident using snorkelling equipment.</p>',
  '<p>Where possible our helpful crew do their best to accommodate all abilities however limitations in your abilities may restrict your participation and opportunities to swim with whales.</p>',
  '<h3>Snorkelling Experience – It helps to Prepare in Advance</h3>',
  '<p>If you haven’t snorkelled much before, we strongly recommend practising before your trip.</p>',
  '<p>Being comfortable breathing through a snorkel, clearing your mask, using fins and swimming with your face in the water makes a significant difference to your experience.</p>',
  '<p>Guests who are unfamiliar with snorkelling equipment can find the experience much more challenging, particularly when combined with open ocean conditions.</p>',
  '<p>The more comfortable and confident you are in the water, the more you will be able to relax, enjoy the experience and appreciate the whales.</p>',
  '<h3>Wildlife &amp; Ocean Conditions – Realistic Expectations</h3>',
  '<p>We operate in the natural environment, and no two days are ever the same.</p>',
  '<p>Whales are wild animals, and their behaviour, movements and willingness to interact are entirely their own. While we have a good success rate, we cannot guarantee that you will swim with a whale, have a close encounter or experience a particular type of interaction.</p>',
  '<p>Sea conditions, visibility, and whale behaviour are all outside our control. Some days may offer calm, clear water and incredible encounters, while others may be more challenging.</p>',
  '<p>Our experienced crew will always make decisions based on safety, conditions, whale behaviour, local regulations and the wellbeing of the animals.</p>',
  '<h3>Finally</h3>',
  '<p>We want you to have an incredible day with us, and being properly prepared makes a huge difference.</p>',
  '<p>If you have any concerns about your swimming ability, fitness, medical conditions or suitability for the activity, please contact us before your trip. We are always happy to chat!</p>',
  `<p>Please do not hesitate to contact us if you have any questions, or visit our FAQs for further information:<br><a href="${FAQ_URL}">${FAQ_URL}</a></p>`,
  '<p>We look forward to welcoming you aboard and sharing a very special day on the water with you!</p>',
  '<p><strong>Mālō ’aupito – The Tahi Tonga Team</strong></p>',
].join('')

/** True when rich text holds no visible words (e.g. an emptied editor's `<p></p>`). */
export function isBlankHtml(html: string | null | undefined): boolean {
  return !html || html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() === ''
}

/** Reads the saved tick-box list; bad or empty data falls back to the defaults. */
export function parseAckItems(raw: string | null | undefined): string[] {
  if (!raw) return DEFAULT_WHALE_FORM.ackItems
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return DEFAULT_WHALE_FORM.ackItems
    const items = parsed.filter((i): i is string => typeof i === 'string' && !isBlankHtml(i))
    return items.length > 0 ? items : DEFAULT_WHALE_FORM.ackItems
  } catch {
    return DEFAULT_WHALE_FORM.ackItems
  }
}

/** Merges saved settings over the defaults for the public booking form. */
export function resolveWhaleForm(get: (key: string) => string | undefined): WhaleFormContent {
  const intro = get('whale_form_guest_intro')
  return {
    guestHeading: get('whale_form_guest_heading')?.trim() || DEFAULT_WHALE_FORM.guestHeading,
    guestIntro: isBlankHtml(intro) ? DEFAULT_WHALE_FORM.guestIntro : intro!,
    guestExample: get('whale_form_guest_example')?.trim() || DEFAULT_WHALE_FORM.guestExample,
    ackIntro: get('whale_form_ack_intro')?.trim() || DEFAULT_WHALE_FORM.ackIntro,
    ackItems: parseAckItems(get('whale_form_ack_items')),
  }
}

const EMAIL_STYLES = {
  h2: 'color:#0a4f6e;font-size:20px;line-height:1.3;margin:28px 0 10px',
  h3: 'color:#0a4f6e;font-size:16px;line-height:1.35;margin:22px 0 8px',
  p: 'font-size:15px;line-height:1.6;margin:0 0 12px',
  list: 'font-size:15px;line-height:1.6;margin:0 0 14px;padding-left:22px',
  li: 'margin:0 0 5px',
  a: 'color:#0a4f6e;font-weight:bold',
}

/**
 * Editor output has no styling of its own, and many mail apps ignore <style> blocks,
 * so every tag gets its styling written inline.
 */
export function styleEmailHtml(html: string): string {
  return html
    .replace(/<li><p>([\s\S]*?)<\/p><\/li>/g, `<li style="${EMAIL_STYLES.li}">$1</li>`)
    .replace(/<li>/g, `<li style="${EMAIL_STYLES.li}">`)
    .replace(/<h[12]>/g, `<h2 style="${EMAIL_STYLES.h2}">`)
    .replace(/<\/h1>/g, '</h2>')
    .replace(/<h[3-6]>/g, `<h3 style="${EMAIL_STYLES.h3}">`)
    .replace(/<\/h[4-6]>/g, '</h3>')
    .replace(/<p>/g, `<p style="${EMAIL_STYLES.p}">`)
    .replace(/<(ul|ol)>/g, `<$1 style="${EMAIL_STYLES.list}">`)
    .replace(/<a /g, `<a style="${EMAIL_STYLES.a}" `)
}

/** Plain-text version of the email body, for mail apps that don't show HTML. */
export function emailHtmlToText(html: string): string {
  return html
    .replace(/<a [^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g, (_, href: string, label: string) =>
      label === href ? href : `${label}: ${href}`,
    )
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<\/p><\/li>/g, '</li>')
    .replace(/<li[^>]*>/g, '- ')
    .replace(/<\/(h[1-6]|p|li|ul|ol)>/g, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\n{2,}/g, '\n\n')
    .trim()
}
