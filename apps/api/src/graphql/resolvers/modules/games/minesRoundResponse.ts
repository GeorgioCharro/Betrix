export const MinesRoundResponse = {
  __resolveType(obj: Record<string, unknown>) {
    if ('payout' in obj) {
      return 'MinesGameOverResponse';
    }
    return 'MinesPlayRoundResponse';
  },
};
