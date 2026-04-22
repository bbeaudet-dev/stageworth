import { TESTFLIGHT_PUBLIC_URL, getAndroidApkUrl } from "@/lib/app-downloads";

/** Apple logo — monochrome for use on dark pill (Sign in with Apple / App Store style). */
export function AppleGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden
      width={20}
      height={20}
    >
      <path
        fill="currentColor"
        d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"
      />
    </svg>
  );
}

/** Android mark — green bot on white/gray pill (Play / Material-adjacent styling, not the Play badge). */
export function AndroidGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden
      width={20}
      height={20}
    >
      <path
        fill="#3DDC84"
        d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993 0 .5511-.4483.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.2439 13.8533 7.8508 12 7.8508s-3.5902.3931-5.1349 1.0987L4.8428 5.4465a.4161.4161 0 00-.5676-.1521.416.416 0 00-.1521.5676l1.9973 3.4592C2.6889 11.186.8532 13.3064.8532 15.8577c0 2.4395 1.9875 4.4202 4.4202 4.4202h13.4532c2.4327 0 4.4202-1.9807 4.4202-4.4202 0-2.5513-1.8357-4.6716-4.3099-5.5365"
      />
    </svg>
  );
}

const iosBtnClass =
  "inline-flex items-center justify-center gap-2.5 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white shadow-md ring-1 ring-black/10 transition-opacity hover:opacity-90";

const androidBtnClass =
  "inline-flex items-center justify-center gap-2.5 rounded-full border border-[#dadce0] bg-white px-5 py-2.5 text-sm font-semibold text-[#3c4043] shadow-sm transition-colors hover:bg-[#f8f9fa]";

export function TestFlightButton({ className }: { className?: string }) {
  return (
    <a
      href={TESTFLIGHT_PUBLIC_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`${iosBtnClass} ${className ?? ""}`}
    >
      <AppleGlyph className="shrink-0 text-white" />
      Join TestFlight beta
    </a>
  );
}

export function AndroidApkButton({ className }: { className?: string }) {
  const url = getAndroidApkUrl();
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`${androidBtnClass} ${className ?? ""}`}
      aria-label="Get Android build — opens Expo to download the APK"
    >
      <AndroidGlyph className="shrink-0" />
      Get Android build
    </a>
  );
}
