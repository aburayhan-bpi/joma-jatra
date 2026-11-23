const InlineLoader = ({ text = "Loading..." }: { text?: string }) => {
  return (
    <div className="flex items-center justify-center gap-2.5 py-10 text-sm text-muted-foreground">
      <div className="animate-spin h-4 w-4 border-2 border-border border-t-primary rounded-full" />
      <span>{text}</span>
    </div>
  );
};

export default InlineLoader;
