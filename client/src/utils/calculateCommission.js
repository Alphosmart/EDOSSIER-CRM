export function calculateCommission(lead) {
  if (lead.currentStatus === 'Closed Won' && lead.negotiatedPrice > 0) {
    return lead.negotiatedPrice * (lead.commissionPercentage / 100);
  }
  return 0;
}

export function calculateWeightedForecast(leads) {
  const activeStatuses = [
    'Interested', 'Needs Proposal', 'Needs Approval',
    'Demo Scheduled', 'Proposal Sent', 'Negotiation'
  ];

  return leads
    .filter(lead => activeStatuses.includes(lead.currentStatus))
    .reduce((total, lead) => {
      const weighted = (lead.negotiatedPrice || 0) * ((lead.probabilityOfClosing || 0) / 100);
      return total + weighted;
    }, 0);
}

export function calculateWinRate(leads) {
  const closedWon = leads.filter(l => l.currentStatus === 'Closed Won').length;
  const closedLost = leads.filter(l => l.currentStatus === 'Closed Lost').length;
  const totalClosed = closedWon + closedLost;

  if (totalClosed === 0) return 0;
  return (closedWon / totalClosed) * 100;
}
