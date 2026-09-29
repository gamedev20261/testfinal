import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../../api/users';
import { labelClassesApi } from '../../api/label-classes';

export const usersKey = ['users'];
export const userGroupsKey = ['user-groups'];
export const labelClassesKey = ['label-classes'];
export const labelGroupsKey = ['label-groups'];

export const useUsers = () => useQuery({ queryKey: usersKey, queryFn: usersApi.list });
export const useUserGroups = () => useQuery({ queryKey: userGroupsKey, queryFn: usersApi.listGroups });
export const useLabelClasses = () => useQuery({ queryKey: labelClassesKey, queryFn: labelClassesApi.list });
export const useLabelGroups = () => useQuery({ queryKey: labelGroupsKey, queryFn: labelClassesApi.listGroups });
