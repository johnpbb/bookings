/**
 * lib/offseasonContent.ts
 * Staff-editable wording for the island and game fishing booking form and confirmation emails.
 * Safe to import from client components. Blank saved values fall back to these defaults.
 */
import { isBlankHtml } from './whaleContent'

export const OFFSEASON_ACK_KEY = 'offseason_form_ack_items'

export const OFFSEASON_EMAILS: { tourId: string; key: string; label: string }[] = [
  { tourId: 'island_reef', key: 'email_reef_body', label: 'Reef & Outer Island Adventure' },
  { tourId: 'island_charter', key: 'email_charter_body', label: 'Private Charter' },
  { tourId: 'game_fishing', key: 'email_fishing_body', label: 'Game Fishing Charter' },
]

export const OFFSEASON_CONTENT_KEYS = [OFFSEASON_ACK_KEY, ...OFFSEASON_EMAILS.map((e) => e.key)]

export const DEFAULT_OFFSEASON_ACKS = [
  '<p>I understand that this trip is subject to <strong>minimum passenger numbers</strong> (excluding private charters) and <strong>suitable ocean conditions</strong>. I acknowledge that if the trip is cancelled due to insufficient passenger numbers or unsuitable ocean conditions, Tahi Tonga will endeavour to accommodate me on an alternative day. If this is not possible, a full refund will be issued, less any applicable bank fees.</p>',
  '<p>I have read, understood and agree to Tahi Tonga’s <a href="https://tahitonga.com/terms-conditions/" target="_blank" rel="noopener noreferrer">Terms &amp; Conditions</a>.</p>',
]

const MAP_LINK = '<p><a href="https://maps.app.goo.gl/vYvxo95vYYk99nFy8?g_st=ic">Click here for the meeting location</a></p>'
const WAIVER_LINK = '<p><a href="https://tahitonga.com/form-of-waiver-indemnity/">Read the Trip Waiver &amp; Indemnity here</a></p>'
const WAIVER_TEXT = '<p>Prior to departure, all guests will be required to sign our <strong>Trip Waiver &amp; Indemnity</strong>. We recommend reading this before your trip so you are familiar with its contents and understand what you are agreeing to.</p>'
const WHARF = '<h2>Meeting Point</h2><p><strong>Faua Wharf, Nuku’alofa, Tongatapu</strong></p>' + MAP_LINK
const FAQ_LINE = '<p>You can also visit our <a href="https://tahitonga.com/faqs/">FAQs</a> for further information.</p>'
const ul = (items: string[]) => `<ul>${items.map((i) => `<li><p>${i}</p></li>`).join('')}</ul>`

const DEFAULT_REEF_EMAIL = [
  '<p>We’re looking forward to welcoming you aboard for your <strong>Reef &amp; Outer Island Adventure with Tahi Tonga!</strong></p>',
  '<p>Below is some important information to help you prepare for your day with us.</p>',
  WHARF,
  '<p>Please arrive at <strong>9:45 AM</strong> so we can get everyone organised and ready for departure.</p>',
  WAIVER_TEXT,
  WAIVER_LINK,
  '<h2>Your Day on the Water</h2>',
  '<p>Our planned schedule is:</p>',
  ul(['<strong>9:45 AM:</strong> Arrival at Faua Wharf', '<strong>10:00 AM:</strong> Planned departure', '<strong>3:00 PM:</strong> Planned return to Faua Wharf']),
  '<p>Please note that these timings are approximate and may change depending on tides, ocean conditions and other operational considerations. If there are any changes to the schedule, we will contact you in advance.</p>',
  '<p>The format of the day may also vary depending on tides and ocean conditions. As a guide, you can expect:</p>',
  ul(['Approximately 45 minutes of boat travel each way through the beautiful islands.', 'Approximately 1 hour dedicated to snorkelling.', 'Approximately 2.5 hours enjoying the island.']),
  '<p>Our guide will be on hand to assist guests who are less confident in the water. If you prefer not to snorkel, you’re very welcome to remain aboard the boat while the others enjoy this part of the trip.</p>',
  '<h2>What’s Included</h2>',
  '<p>We’ve got the essentials covered!</p>',
  ul([
    '<strong>Snorkelling equipment:</strong> Shorty wetsuit, fins, mask and snorkel. Please arrive wearing your swimwear, ready to get in the water.',
    '<strong>Light lunch:</strong> A roll or sandwich, fresh drinking coconut and local fruit.',
    '<strong>Drinking water:</strong> Refills are available on board, so please bring your own reusable water bottle.',
    '<strong>Shade &amp; Stand-up paddleboard:</strong> Available subject to weather conditions.',
  ]),
  '<h2>What to Bring</h2>',
  '<p>To make the most of your day, we recommend bringing:</p>',
  ul([
    'Any personal medication you may need.',
    'Seasickness medication - if you are prone. It’s always better to be prepared!',
    'Sun protection.',
    'A reusable water bottle (refills available on board).',
    'A towel and dry clothes to change into after your trip.',
    'Your own extras: you’re welcome to bring along any additional food or drinks you’d like for the day.',
  ]),
  '<h2>A Final Note</h2>',
  '<p>We want you to have an incredible day exploring the beautiful islands and waters of Tonga.</p>',
  '<p>If you have any questions or concerns before your trip, please don’t hesitate to get in touch. We’re always happy to help!</p>',
  FAQ_LINE,
  '<p>We look forward to welcoming you aboard and sharing a very special day on the water with you!</p>',
  '<p><strong>Mālō ’aupito,</strong><br><strong>The Tahi Tonga Team</strong></p>',
].join('')

const DEFAULT_CHARTER_EMAIL = [
  '<p>We’re looking forward to welcoming you aboard for your Reef &amp; Outer Island Adventure with Tahi Tonga!</p>',
  '<p>As you’ve booked a private charter, there’s some flexibility around departure times and how you’d like to spend your day. We’d love to make the experience as enjoyable as possible for your group, so please feel free to get in touch if you’d like to discuss any adjustments to the planned schedule or activities.</p>',
  '<p>Below is some important information to help you prepare for your day with us.</p>',
  WHARF,
  '<p>Your private charter can accommodate <strong>up to 10 guests.</strong></p>',
  '<p>Please arrive at <strong>9:45 AM</strong> unless an alternative arrival time has been agreed upon.</p>',
  WAIVER_TEXT,
  WAIVER_LINK,
  '<h2>Your Day on the Water</h2>',
  '<p>Our suggested schedule is:</p>',
  ul(['<strong>9:45 AM:</strong> Arrival at Faua Wharf', '<strong>10:00 AM:</strong> Planned departure', '<strong>3:00 PM:</strong> Planned return to Faua Wharf']),
  '<p>As this is a private charter, we’re happy to discuss adjustments to these timings in advance. Please note that the final schedule will depend on tides, ocean conditions and other operational considerations.</p>',
  '<p>The format of the day may also vary depending on conditions. As a guide, you can expect:</p>',
  ul(['Approximately 45 minutes of boat travel each way through the beautiful islands.', 'Approximately 1 hour dedicated to snorkelling.', 'Approximately 2.5 hours enjoying the island.']),
  '<p>Our crew will be on hand to assist guests who are less confident in the water.</p>',
  '<h2>What’s Included</h2>',
  '<p>We’ve got the essentials covered!</p>',
  ul([
    '<strong>Snorkelling equipment:</strong> Shorty wetsuit, fins, mask and snorkel. Please arrive wearing your swimwear, ready to get in the water.',
    '<strong>Light lunch:</strong> A roll or sandwich, fresh drinking coconut and local fruit.',
    '<strong>Drinking water:</strong> Refills are available on board, so please bring your own reusable water bottle.',
    '<strong>Shade and stand-up paddleboard:</strong> Available subject to weather and ocean conditions.',
  ]),
  '<h2>What to Bring</h2>',
  '<p>To make the most of your day, we recommend bringing:</p>',
  ul([
    'Any personal medication you may need.',
    'Seasickness medication, if you are prone to seasickness. It’s always better to be prepared!',
    'Sun protection',
    'A reusable water bottle (refills available on board).',
    'A towel and dry clothes to change into after your trip.',
    'Your own extras: You’re welcome to bring along any additional food, snacks or drinks you’d like to enjoy throughout the day.',
  ]),
  '<h2>A Final Note</h2>',
  '<p>We want you to have an incredible day exploring the beautiful islands and waters of Tonga with us.</p>',
  '<p>If you have any questions or would like to discuss anything before your trip, please don’t hesitate to get in touch. We’re always happy to help!</p>',
  FAQ_LINE,
  '<p>We look forward to welcoming you aboard, showing you some of Tonga’s beauty and sharing a fantastic day on the water with you!</p>',
  '<p>Mālō ’aupito,<br>The Tahi Tonga Team</p>',
].join('')

const DEFAULT_FISHING_EMAIL = [
  '<p>We’re looking forward to welcoming you aboard for your <strong>Game Fishing Charter with Tahi Tonga!</strong></p>',
  '<p>As you’ve booked a private charter, there’s some flexibility around departure times, so please feel free to get in touch if you’d like to discuss any adjustments to the planned schedule below.</p>',
  '<p>Following is some important information to help you prepare for your day with us.</p>',
  WHARF,
  '<p>Please arrive at <strong>6:00 AM,</strong> unless an alternative arrival time has been agreed upon.</p>',
  '<p>We recommend a maximum of <strong>4 guests</strong> for this charter. If you’d like to bring additional guests please get in touch and we’d be happy to discuss what is possible.</p>',
  WAIVER_TEXT,
  WAIVER_LINK,
  '<h2>Your Day on the Water</h2>',
  '<p>Our planned schedule is:</p>',
  ul(['6.00 AM: Departure from Faua Wharf', '10.00 AM: Planned return to Faua Wharf']),
  '<p>Should there be any changes to the planned schedule then we will contact you to discuss.</p>',
  '<h2>What’s Included</h2>',
  '<p>We’ve got the essentials covered!</p>',
  ul([
    '<strong>Fishing equipment:</strong> All required game fishing equipment.',
    '<strong>Light breakfast:</strong> Including the offer of a hot drink.',
    '<strong>Drinking water:</strong> Refills are available on board, so please bring your own reusable water bottle.',
    '<strong>Your catch:</strong> One fish from the day’s catch is included for your group to keep. Any additional catch remains with the boat.',
  ]),
  '<h2>What to Bring</h2>',
  '<p>To make the most of your day, we recommend bringing:</p>',
  ul([
    'Any personal medication you may need',
    'Sun protection',
    'A reusable water bottle (refills available onboard).',
    'Seasickness medication, if required. If you are prone to seasickness we strongly recommend taking it before departure.',
    'Your own extras: You’re welcome to bring along any additional food, snacks or drinks you’d like to enjoy throughout the day.',
  ]),
  '<p><strong>A note about the fishing:</strong> While we have a good success rate, game fishing is an open-ocean wildlife activity and catches can never be guaranteed. Some days are more productive than others, and that’s all part of fishing! We recommend keeping the group to four guests to give everyone a better opportunity to get involved and hopefully wind in a good one.</p>',
  '<h2>A Final Note</h2>',
  '<p>We want you to have an incredible day out with us!</p>',
  '<p>If you have any questions or would like to discuss anything before your trip, please don’t hesitate to get in touch. We’re always happy to help!</p>',
  FAQ_LINE,
  '<p>We look forward to welcoming you aboard and sharing a fantastic day on the water with you!</p>',
  '<p>Mālō ’aupito,<br>The Tahi Tonga Team</p>',
].join('')

export const DEFAULT_OFFSEASON_EMAILS: Record<string, string> = {
  email_reef_body: DEFAULT_REEF_EMAIL,
  email_charter_body: DEFAULT_CHARTER_EMAIL,
  email_fishing_body: DEFAULT_FISHING_EMAIL,
}

export function offseasonEmailKey(tourId: string): string | null {
  return OFFSEASON_EMAILS.find((e) => e.tourId === tourId)?.key ?? null
}

export function parseOffseasonAcks(raw: string | null | undefined): string[] {
  if (!raw) return DEFAULT_OFFSEASON_ACKS
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return DEFAULT_OFFSEASON_ACKS
    const items = parsed.filter((i): i is string => typeof i === 'string' && !isBlankHtml(i))
    return items.length > 0 ? items : DEFAULT_OFFSEASON_ACKS
  } catch {
    return DEFAULT_OFFSEASON_ACKS
  }
}
