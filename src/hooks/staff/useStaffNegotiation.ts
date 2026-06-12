import { useState } from "react";
import { useGame } from "@/game/store";
import { toast } from "sonner";
import { formatCurrency } from "@/core/common/formatting";
import { evaluateOffer, PATIENCE_BY_TIER, FLOOR_BY_TIER } from "@/core/staff/staffNegotiation";
import type { StaffMember } from "@/core/staff/staffTypes";

export function useStaffNegotiation(staff: StaffMember, onClose: () => void) {
  const { day, cash, hireAtNegotiatedSalary, flagStaffOffended } = useGame() as any;
  const [offerAmount, setOfferAmount] = useState(String(staff.salary));
  const [offerError, setOfferError] = useState("");
  const [roundsUsed, setRoundsUsed] = useState(staff.negotiationRounds ?? 0);
  const [currentCounter, setCurrentCounter] = useState<number | null>(null);

  const askingSalary = currentCounter ?? staff.salary;
  const patience = PATIENCE_BY_TIER[staff.tier];
  const floor = FLOOR_BY_TIER[staff.tier];
  const minOffer = Math.ceil(staff.salary * floor);

  const handleClose = () => {
    setOfferAmount(String(staff.salary));
    setOfferError("");
    setRoundsUsed(staff.negotiationRounds ?? 0);
    setCurrentCounter(null);
    onClose();
  };

  const handleSubmit = () => {
    const amount = Number(offerAmount.replace(/,/g, "").replace(/\$/g, ""));
    if (!amount || amount <= 0) {
      setOfferError("Please enter a valid salary.");
      return;
    }
    if (cash < amount) {
      setOfferError(`Insufficient funds.`);
      return;
    }

    const result = evaluateOffer(staff, askingSalary, amount, roundsUsed);

    if (result.outcome === "accept") {
      const r = hireAtNegotiatedSalary(staff.id, amount);
      if (!r.ok) {
        setOfferError(r.reason ?? "Hire failed.");
        return;
      }
      toast.success(`${staff.name} joins your stable at ${formatCurrency(amount)}/day.`);
      handleClose();
    } else if (result.outcome === "counter") {
      const newRounds = roundsUsed + 1;
      setRoundsUsed(newRounds);
      setCurrentCounter(result.counterSalary!);
      setOfferAmount(String(result.counterSalary));
      setOfferError("");
    } else {
      flagStaffOffended(staff.id, day + 30);
      toast.error(`${staff.name} walks away. They won't negotiate for 30 days.`);
      handleClose();
    }
  };

  return {
    offerAmount,
    setOfferAmount,
    offerError,
    setOfferError,
    roundsUsed,
    askingSalary,
    patience,
    minOffer,
    handleClose,
    handleSubmit,
  };
}
