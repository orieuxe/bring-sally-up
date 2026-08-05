import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { moderateScale as ms, scale } from 'react-native-size-matters';
import { COLORS } from '../../theme';

type Props = {
  label: string;
  value: string;
  valueColor?: string;
  /** Personal best for that stat, shown under the value. */
  record?: string;
  /** When that best was set. */
  recordDate?: string;
};

// Both home cards share this shape: label, big current value, record under it.
export default function StatCard({
  label,
  value,
  valueColor = COLORS.text,
  record,
  recordDate,
}: Props) {
  return (
    <View style={[styles.card, {
      paddingHorizontal: scale(12),
      paddingVertical: scale(16),
      borderRadius: scale(16),
    }]}
    >
      <Text style={[styles.label, { fontSize: ms(11) }]}>{label}</Text>
      <Text style={[styles.value, {
        fontSize: ms(42),
        color: valueColor,
      }]}
      >
        {value}
      </Text>
      {/* Both lines always render so the two cards keep the same height. */}
      <Text style={[styles.record, { fontSize: ms(12) }]}>
        {record ? `record ${record}` : ' '}
      </Text>
      <Text style={[styles.recordDate, { fontSize: ms(11) }]}>{recordDate ?? ' '}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.card,
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    elevation: 4,
  },
  label: {
    color: COLORS.grey,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 4,
  },
  value: {
    fontWeight: '300',
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  record: {
    color: COLORS.greyDim,
    marginTop: 4,
    letterSpacing: 1,
  },
  recordDate: {
    color: COLORS.greyDim,
    opacity: 0.85,
    marginTop: 2,
  },
});
