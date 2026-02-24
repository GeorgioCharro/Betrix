export const ChickenRoadRoundResponse = {
  __resolveType(obj: Record<string, unknown>) {
    if (obj.active === false && 'payout' in obj) {
      return 'ChickenRoadGameOverResponse';
    }
    return 'ChickenRoadPlayRoundResponse';
  },
};
