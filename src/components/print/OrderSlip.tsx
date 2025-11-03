import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface OrderSlipProps {
  order: any;
}

const OrderSlip = ({ order }: OrderSlipProps) => {
  return (
    <div className="print-only max-w-4xl mx-auto p-8 bg-white text-black">
      <style>
        {`
          @media print {
            body { margin: 0; padding: 0; }
            .no-print { display: none !important; }
            .print-only { display: block !important; }
          }
          @media screen {
            .print-only { display: none; }
          }
        `}
      </style>

      {/* Header */}
      <div className="mb-8 pb-4 border-b-2 border-black">
        <h1 className="text-3xl font-bold mb-2">BON DE COMMANDE</h1>
        <div className="flex justify-between text-sm">
          <div>
            <p className="font-semibold">N° Commande: {order.id.slice(0, 8).toUpperCase()}</p>
            <p>Date: {format(new Date(), "dd/MM/yyyy", { locale: fr })}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-lg">{order.services?.name}</p>
            <div
              className="h-1 w-24 mt-1 ml-auto"
              style={{ backgroundColor: order.services?.color }}
            />
          </div>
        </div>
      </div>

      {/* Customer Info */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div>
          <h2 className="text-lg font-bold mb-2">Client</h2>
          <p className="font-semibold text-lg">{order.customers?.name || "Non spécifié"}</p>
          {order.customers?.phone && <p>Tél: {order.customers.phone}</p>}
          {order.customers?.email && <p>Email: {order.customers.email}</p>}
        </div>
        <div>
          <h2 className="text-lg font-bold mb-2">Livraison</h2>
          <p className="font-semibold">
            {order.location === "livraison" ? "Livraison" : "Retrait en magasin"}
          </p>
          {order.address && <p className="mt-1">{order.address}</p>}
          <p className="mt-2 text-sm">
            <span className="font-semibold">Date/Heure:</span>{" "}
            {format(new Date(order.due_at), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
          </p>
        </div>
      </div>

      {/* Order Details */}
      <div className="mb-6">
        <div className="flex gap-4 text-sm mb-2">
          <span>
            <strong>Type:</strong> {order.type}
          </span>
          <span>
            <strong>Statut:</strong> {order.status}
          </span>
          <span>
            <strong>Priorité:</strong> {order.priority}
          </span>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-6">
        <h2 className="text-lg font-bold mb-3">Articles</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2 text-left">Produit</th>
              <th className="border border-gray-300 p-2 text-center w-24">Quantité</th>
              <th className="border border-gray-300 p-2 text-center w-24">Unité</th>
              <th className="border border-gray-300 p-2 text-left">Commentaire</th>
            </tr>
          </thead>
          <tbody>
            {order.order_items && order.order_items.length > 0 ? (
              order.order_items.map((item: any, index: number) => (
                <tr key={index}>
                  <td className="border border-gray-300 p-2">{item.product_name}</td>
                  <td className="border border-gray-300 p-2 text-center">{item.quantity}</td>
                  <td className="border border-gray-300 p-2 text-center">{item.unit}</td>
                  <td className="border border-gray-300 p-2">{item.comment || "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="border border-gray-300 p-4 text-center text-gray-500">
                  Aucun article
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="mb-6">
          <h2 className="text-lg font-bold mb-2">Notes internes</h2>
          <div className="border border-gray-300 p-3 whitespace-pre-wrap bg-gray-50">
            {order.notes}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-300 text-xs text-gray-600">
        <p>Document généré le {format(new Date(), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}</p>
      </div>
    </div>
  );
};

export default OrderSlip;
