const OrderStatusBadge = ({ status }: { status: '承認待ち' | '承認済み' | undefined }) => {
  if (!status) return null;
  const isPending = status === '承認待ち';
  const styles = isPending ? 'bg-orange-100 text-orange-800' : 'bg-sky-100 text-sky-800';
  return (
    <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles}`}>
      {status}
    </span>
  );
};

export default OrderStatusBadge;
