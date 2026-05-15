from training.trainer import parse_args, train_modality


if __name__ == "__main__":
    args = parse_args("ctscan", ["ctscan", "ct-scan", "CT", "Data"])
    train_modality(args)
