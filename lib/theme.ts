import { createTheme, rem } from "@mantine/core";

export const theme = createTheme({
  fontFamily: "var(--font-poppins), sans-serif",
  headings: {
    fontFamily: "var(--font-poppins), sans-serif",
    fontWeight: "700",
  },
  primaryColor: "gold",
  colors: {
    gold: [
      "#fffdf0",
      "#fff8d9",
      "#fdedb8",
      "#fae090",
      "#f4c858",
      "#d4a017",
      "#a87f12",
      "#7e5e0d",
      "#543e08",
      "#2a1e03"
    ],
  },
  defaultRadius: "sm",
  radius: {
    xs: rem(6),
    sm: rem(10),
    md: rem(14),
    lg: rem(20),
    xl: rem(28),
  },
  components: {
    Button: { defaultProps: { radius: "md" } },
    Card: { defaultProps: { radius: "lg" } },
    TextInput: { defaultProps: { radius: "md" } },
    Select: { defaultProps: { radius: "md" } },
    PasswordInput: { defaultProps: { radius: "md" } },
  },
});
