import { redirect } from "next/navigation";

/** مسیر قدیمی بازارچه؛ انتخاب و پیگیری مأموریت حالا داخل کمپ مأموریت انجام می‌شود. */
export default function MissionsRedirectPage() {
  redirect("/mission-rooms");
}
