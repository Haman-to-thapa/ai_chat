type Props = {
  connected: boolean;
};

export default function ConnectionStatus({ connected }: Props) {
  return (
    <div className="text-xs flex items-center gap-1">
      <span
        className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"
          }`}
      />
      {connected ? "Connected" : "Disconnected"}
    </div>
  );
}
