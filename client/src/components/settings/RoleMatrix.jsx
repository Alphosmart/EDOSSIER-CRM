import { PERMISSION_GROUPS, ROLE_PERMISSIONS } from '../../utils/permissions';
import { ROLE_LABELS } from '../../utils/constants';

const ROLE_ORDER = ['admin', 'bursar', 'manager', 'team_lead', 'sales_rep'];

function getPermissionRows() {
  const rows = [];
  Object.entries(PERMISSION_GROUPS).forEach(([groupName, permissions]) => {
    rows.push({ type: 'group', groupName });
    permissions.forEach((permission) => {
      rows.push({
        type: 'permission',
        groupName,
        key: permission.key,
        label: permission.label,
        description: permission.description,
        value: permission.key
      });
    });
  });
  return rows;
}

function hasRolePermission(role, permissionValue) {
  const rolePermissions = ROLE_PERMISSIONS[role] || [];
  return rolePermissions.includes(permissionValue);
}

export default function RoleMatrix() {
  const rows = getPermissionRows();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Role Matrix</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Snapshot of default role permissions used across the app.
        </p>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500 uppercase text-xs">
                <th className="px-4 py-3">Permission</th>
                <th className="px-4 py-3">Description</th>
                {ROLE_ORDER.map((role) => (
                  <th key={role} className="px-4 py-3 text-center whitespace-nowrap">
                    {ROLE_LABELS[role] || role}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row, index) => {
                if (row.type === 'group') {
                  return (
                    <tr key={`group-${row.groupName}-${index}`} className="bg-gray-50/70">
                      <td className="px-4 py-2 font-semibold text-gray-700" colSpan={2 + ROLE_ORDER.length}>
                        {row.groupName}
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={`perm-${row.key}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{row.label}</td>
                    <td className="px-4 py-3 text-gray-500">{row.description}</td>
                    {ROLE_ORDER.map((role) => {
                      const allowed = hasRolePermission(role, row.value);
                      return (
                        <td key={`${row.key}-${role}`} className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                              allowed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            {allowed ? '✓' : '—'}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}