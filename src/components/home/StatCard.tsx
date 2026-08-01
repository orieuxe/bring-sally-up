import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { moderateScale as ms, scale } from 'react-native-size-matters';
import { COLORS } from '../../theme';

type Props = {
  label: string;
  value: string;
  valueColor?: string;
  /** Small glyph sitting on the value's baseline (flame, star…). */
  icon?: string;
  /** Personal best for that stat, shown under the value. */
  record?: string;
};

// Both home cards share this shape: label, big current value, record under it.
export default function StatCard({ label, value, valueColor = COLORS.text, icon, record }: Props) {
  return (
    <View style={[styles.card, {
      paddingHorizontal: scale(12),
      paddingVertical: scale(16),
      borderRadius: scale(16),
    }]}
    >
      <Text style={[styles.label, { fontSize: ms(11) }]}>{label}</Text>
      <View style={styles.valueRow}>
        {icon && <Text style={{ fontSize: ms(20) }}>{icon}</Text>}
        <Text style={[styles.value, {
          fontSize: ms(42),
          color: valueColor,
        }]}
        >
          {value}
        </Text>
      </View>
      <Text style={[styles.record, { fontSize: ms(12) }]}>
        {record ? `record ${record}` : ' '}
      </Text>
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
    color: COLORS.hint,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 4,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  icon: { lineHeight: undefined },
  value: {
    fontWeight: '300',
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  record: {
    color: COLORS.faint,
    marginTop: 4,
    letterSpacing: 1,
  },
});
