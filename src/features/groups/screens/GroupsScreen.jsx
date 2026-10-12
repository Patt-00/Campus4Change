import React, { useState } from 'react';
import {
  SectionList,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
} from 'react-native';
import { AppButton } from '../../../shared/components/AppButton';
import { Screen } from '../../../shared/components/Screen';
import { Field } from '../../../shared/components/UI';

import { IconBadge } from '../../../shared/components/Icon';
import { s } from '../../../shared/theme/styles';

export function GroupsScreen({
  go,
  back,
  groups,
  hasMoreGroups = false,
  groupsLive = true,
  loadingMoreGroups = false,
  loadMoreGroups,
  refreshGroups,
}) {
  const [query, setQuery] = useState('');
  const filtered = groups.filter(g =>
    (g.name + ' ' + g.subject)
      .toLowerCase()
      .includes(query.toLowerCase().trim()),
  );
  const joinedGroups = filtered.filter(group => group.joined);
  const discoverGroups = filtered.filter(group => !group.joined);
  const emptyJoinedMessage = query.trim()
    ? 'No joined groups match this search.'
    : 'Join a group or create your own.';
  const emptyDiscoverMessage = query.trim()
    ? hasMoreGroups
      ? 'No discoverable matches on this page. Load older groups to search further.'
      : 'No discoverable groups match this search.'
    : hasMoreGroups
      ? 'No discoverable groups on this page. Load older groups to see more.'
      : groups.length
        ? 'You have joined every available group.'
        : 'Create your first group to organize study notes.';
  const sections = [
    {
      key: 'joined',
      title: 'Your groups',
      data: joinedGroups.length
        ? joinedGroups
        : [{ id: 'empty-joined', emptyMessage: emptyJoinedMessage }],
    },
    {
      key: 'discover',
      title: 'Discover',
      data: discoverGroups.length
        ? discoverGroups
        : [{ id: 'empty-discover', emptyMessage: emptyDiscoverMessage }],
    },
  ];
  const listHeader = (
    <>
      <AppButton title="+ CREATE GROUP" onPress={() => go('Create Group')} />
      <View style={s.gap} />
      <Field
        placeholder="Search study groups"
        value={query}
        onChangeText={setQuery}
      />
    </>
  );
  const listFooter = (
    <View>
      {hasMoreGroups && (
        <AppButton
          title={loadingMoreGroups ? 'LOADING OLDER GROUPS...' : 'LOAD OLDER GROUPS'}
          outline
          disabled={loadingMoreGroups}
          onPress={loadMoreGroups}
        />
      )}
      {!groupsLive && groups.some(group => group.shared) && (
        <AppButton
          title="REFRESH LATEST GROUPS"
          outline
          onPress={refreshGroups}
        />
      )}
      <View style={s.bigGap} />
    </View>
  );

  function renderGroup(group) {
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={'Open ' + group.name}
        style={[s.card, s.row, styles.minHeight104]}
        onPress={() =>
          go({
            page: 'Group Details',
            groupId: group.id,
          })
        }
      >
        <IconBadge name="users" />
        <View style={s.grow}>
          <Text style={s.name}>{group.name}</Text>
          <Text style={s.muted}>
            {group.members} {group.members === 1 ? 'member' : 'members'} •{' '}
            {group.joined ? 'Joined' : 'Not joined'} •{' '}
            {group.shared ? 'Shared group' : 'On this device'}
          </Text>
          <Text style={[s.link, styles.marginTop8]}>Open group</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <Screen title="Study Groups" back={back} go={go} tab="Home" scroll={false}>
      <SectionList
        style={s.grow}
        sections={sections}
        keyExtractor={item => item.id}
        renderSectionHeader={({ section }) => (
          <Text
            style={[
              s.section,
              section.key === 'joined' && styles.marginTop8,
            ]}
          >
            {section.title}
          </Text>
        )}
        renderItem={({ item }) =>
          item.emptyMessage ? (
            <Text style={s.muted}>{item.emptyMessage}</Text>
          ) : (
            renderGroup(item)
          )
        }
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        stickySectionHeadersEnabled={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  minHeight104: {
    minHeight: 104,
  },
  marginTop8: {
    marginTop: 8,
  },
});
