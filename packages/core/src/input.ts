import { Content, ContentStyle } from "./types/content";

export async function InputContent(contents: Content[], styles: ContentStyle[]) {
  if (!contents || contents.length === 0) {
    throw new Error("Contents is invalid");
  }
  if (!styles || styles.length === 0) {
    throw new Error("Styles is invalid");
  }
  return { contents, styles };
}
