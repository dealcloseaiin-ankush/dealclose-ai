const { buildFlowSaveQuery, buildFlowListQuery } = require('./flowController');

describe('flow query builders', () => {
  it('keeps main and branch flows separate by platform and workspace', () => {
    expect(buildFlowSaveQuery({ userId: 'user-1', name: 'Welcome Flow', workspaceId: 'main', platform: 'whatsapp' })).toEqual({
      userId: 'user-1',
      name: 'Welcome Flow',
      platform: 'whatsapp'
    });

    expect(buildFlowSaveQuery({ userId: 'user-1', name: 'Welcome Flow', workspaceId: 'branch-1', platform: 'instagram' })).toEqual({
      userId: 'user-1',
      name: 'Welcome Flow',
      platform: 'instagram',
      workspaceId: 'branch-1'
    });
  });

  it('filters main workspace flows correctly while preserving platform scoping', () => {
    expect(buildFlowListQuery({ userId: 'user-1', workspaceId: 'main', platform: 'instagram' })).toEqual({
      $and: [
        { userId: 'user-1' },
        { platform: 'instagram' },
        {
          $or: [
            { workspaceId: 'main' },
            { workspaceId: { $in: [null, ''] } },
            { workspaceId: { $exists: false } }
          ]
        }
      ]
    });
  });
});
