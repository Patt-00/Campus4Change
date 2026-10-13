import React from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppButton } from '../../../shared/components/AppButton';
import { Screen } from '../../../shared/components/Screen';
import { Empty, Link } from '../../../shared/components/UI';
import { dateLabel } from '../../../shared/data/utils';
import { s } from '../../../shared/theme/styles';

const reasonLabel = reason =>
  reason === 'spam' ? 'Spam' : 'Abuse or unsafe content';

export function GroupReportsScreen({
  back,
  group,
  reports = [],
  error = '',
  loadingReports = false,
  hasMoreReports = false,
  reportsLive = true,
  loadingMoreReports = false,
  loadMoreReports,
  refreshReports,
  moderateReport,
}) {
  function confirmModeration(report, resolution) {
    const action =
      resolution === 'hidden' ? 'Hide this content?' : 'Restore this content?';
    const message =
      resolution === 'hidden'
        ? 'Members will no longer see it. You can restore it later.'
        : 'Members will be able to see it again.';
    Alert.alert(action, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: resolution === 'hidden' ? 'Hide content' : 'Restore content',
        style: resolution === 'hidden' ? 'destructive' : 'default',
        onPress: () => moderateReport(report.id, resolution),
      },
    ]);
  }

  return (
    <Screen title="Group Reports" back={back} scroll={false}>
      <FlatList
        style={s.grow}
        contentContainerStyle={styles.listContent}
        data={reports}
        keyExtractor={report => report.id}
        initialNumToRender={12}
        maxToRenderPerBatch={8}
        windowSize={7}
        ListHeaderComponent={
          <View>
            <Text style={s.section}>{group.name}</Text>
            <Text style={s.muted}>
              Only group owners can review reports. Reporter identity is not
              included in a report.
            </Text>
            {!!error && (
              <Text accessibilityRole="alert" style={s.error}>
                Reports could not be loaded: {error}
              </Text>
            )}
            {!!error && <Link label="Retry reports" onPress={refreshReports} />}
          </View>
        }
        renderItem={({ item: report }) => (
          <View style={s.card}>
            <Text style={s.section}>
              {report.targetType === 'post' ? 'Post' : 'Reply'} •{' '}
              {reasonLabel(report.reason)}
            </Text>
            <Text style={s.muted}>Content by {report.targetAuthor}</Text>
            <Text style={s.text}>{report.contentSnapshot}</Text>
            <Text style={[s.muted, styles.status]}>
              Reported {dateLabel(report.createdAt)} • {report.status}
            </Text>
            {report.status === 'open' && (
              <>
                <Link
                  label="Dismiss report"
                  onPress={() => moderateReport(report.id, 'dismissed')}
                />
                <AppButton
                  title="HIDE CONTENT"
                  outline
                  onPress={() => confirmModeration(report, 'hidden')}
                />
              </>
            )}
            {report.status === 'hidden' && (
              <AppButton
                title="RESTORE CONTENT"
                outline
                onPress={() => confirmModeration(report, 'restored')}
              />
            )}
          </View>
        )}
        ListEmptyComponent={
          loadingReports ? (
            <View style={styles.loading}>
              <ActivityIndicator color="#52d6e8" size="large" />
              <Text style={s.muted}>Loading reports...</Text>
            </View>
          ) : error ? null : (
            <Empty
              title="No reports yet"
              body="Reports from group members will appear here for your review."
            />
          )
        }
        ListFooterComponent={
          <View>
            {hasMoreReports && (
              <AppButton
                title={
                  loadingMoreReports
                    ? 'LOADING OLDER REPORTS...'
                    : 'LOAD OLDER REPORTS'
                }
                outline
                disabled={loadingMoreReports}
                onPress={loadMoreReports}
              />
            )}
            {!reportsLive && !loadingMoreReports && !loadingReports && (
              <AppButton
                title="REFRESH LATEST REPORTS"
                outline
                onPress={refreshReports}
              />
            )}
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  listContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  status: {
    marginTop: 12,
  },
  loading: {
    alignItems: 'center',
    paddingVertical: 24,
  },
});
