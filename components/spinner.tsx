type SpinnerProps = {
  size?: "small" | "large";
};

export default function Spinner({ size = "small" }: SpinnerProps) {
  return (
    <span
      className={`spinner${size === "large" ? " spinner-large" : ""}`}
      aria-hidden="true"
    />
  );
}
