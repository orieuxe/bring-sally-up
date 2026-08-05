import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { moderateScale as ms, scale } from 'react-native-size-matters';
import { COLORS } from '../../theme';

type Choice = 'day' | 'all';

type Props = {
  visible: boolean;
  /** Label of the currently viewed session, e.g. "4 août 2026 · 4:12". */
  dayLabel: string | null;
  onDeleteDay: () => void;
  onDeleteAll: () => void;
  onCancel: () => void;
};

// Asks which of the two deletions is meant: the session on screen, or
// everything. Same dialog on web and native — Alert can't do it on web.
export default function DeleteSheet({
  visible,
  dayLabel,
  onDeleteDay,
  onDeleteAll,
  onCancel,
}: Props) {
  const [choice, setChoice] = useState<Choice | null>(null);

  // Never reopen on the previous answer.
  useEffect(() => { if (visible) setChoice(null); }, [visible]);

  const option = (value: Choice, label: string, sub: string, disabled = false) => (
    <TouchableOpacity
      style={[styles.option, disabled && styles.optionDisabled]}
      disabled={disabled}
      onPress={() => setChoice(value)}
    >
      <View style={[styles.radio, choice === value && styles.radioOn]}>
        {choice === value && <View style={styles.radioDot} />}
      </View>
      <View style={styles.optionLabels}>
        <Text style={[styles.optionText, { fontSize: ms(14) }]}>{label}</Text>
        <Text style={[styles.optionSub, { fontSize: ms(12) }]}>{sub}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        {/* Swallows taps so pressing the card doesn't dismiss it. */}
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={[styles.title, { fontSize: ms(15) }]}>
            Que voulez-vous supprimer ?
          </Text>

          {option(
            'day',
            'la séance affichée',
            dayLabel ?? 'aucune séance sélectionnée',
            !dayLabel,
          )}
          {option('all', 'tout l\'historique', 'toutes les séances seront perdues')}

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={onCancel}>
              <Text style={[styles.cancelText, { fontSize: ms(14) }]}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.deleteBtn, !choice && styles.btnDisabled]}
              disabled={!choice}
              onPress={choice === 'all' ? onDeleteAll : onDeleteDay}
            >
              <Text style={[styles.deleteText, { fontSize: ms(14) }]}>Supprimer</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: scale(340),
    backgroundColor: COLORS.cardRaised,
    borderRadius: 16,
    padding: 16,
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    elevation: 8,
  },
  title: {
    color: COLORS.text,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    marginBottom: 8,
  },
  optionDisabled: { opacity: 0.4 },
  radio: {
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    borderWidth: 2,
    borderColor: COLORS.greyDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: COLORS.bad },
  radioDot: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    backgroundColor: COLORS.bad,
  },
  optionLabels: { flex: 1 },
  optionText: {
    color: COLORS.text,
    fontWeight: '600',
  },
  optionSub: {
    color: COLORS.greyDim,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 10,
  },
  btn: {
    paddingVertical: 9,
    paddingHorizontal: 22,
    borderRadius: 12,
    alignItems: 'center',
    // Raised enough to read as the thing you press, not another row.
    boxShadow: '0 2px 6px rgba(0,0,0,0.45)',
    elevation: 4,
  },
  btnDisabled: {
    opacity: 0.35,
    boxShadow: 'none',
    elevation: 0,
  },
  cancelBtn: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  cancelText: {
    color: COLORS.grey,
    fontWeight: '700',
  },
  deleteBtn: { backgroundColor: COLORS.bad },
  deleteText: {
    color: COLORS.text,
    fontWeight: '700',
  },
});
